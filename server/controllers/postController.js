import imageKit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import fs from "fs";
import User from "../models/User.js";
import { getAuth } from "@clerk/express";

const postPopulateOptions = [
    { path: "user" },
    { path: "comments.user", select: "full_name username profile_picture" },
];

const getPopulatedPostById = (postId) =>
    Post.findById(postId).populate(postPopulateOptions);

const removeTempFile = async (filePath) => {
    if (!filePath) {
        return;
    }

    await fs.promises.unlink(filePath).catch(() => null);
};

const uploadPostImage = async (image) => {
    try {
        const response = await imageKit.files.upload({
            file: fs.createReadStream(image.path),
            fileName: image.originalname,
            folder: "posts",
        });

        const src = response.url ?? response.filePath;
        if (!src) {
            throw new Error("ImageKit upload did not return a file URL");
        }

        return imageKit.helper.buildSrc({
            src,
            urlEndpoint: response.url ? undefined : process.env.IMAGEKIT_URL_ENDPOINT,
            transformation: [
                { quality: "auto" },
                { format: "webp" },
                { width: "1280" },
            ],
        });
    } finally {
        await removeTempFile(image.path);
    }
};

const uploadPostVideo = async (video) => {
    try {
        const response = await imageKit.files.upload({
            file: fs.createReadStream(video.path),
            fileName: video.originalname,
            folder: "posts",
        });

        const src = response.url ?? response.filePath;
        if (!src) {
            throw new Error("ImageKit upload did not return a file URL");
        }

        return response.url ?? imageKit.helper.buildSrc({
            src,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        });
    } finally {
        await removeTempFile(video.path);
    }
};

//Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const content = req.body?.content?.trim?.() ?? "";
        const images = req.files?.images ?? [];
        const video = req.files?.video?.[0] ?? null;

        if (!content && !images.length && !video) {
            return res.json({ success: false, message: "Please add text, images, or a video" });
        }

        if (images.length && video) {
            return res.json({ success: false, message: "Please upload either images or one video" });
        }

        if (images.some((image) => !image.mimetype?.startsWith("image/"))) {
            await Promise.all(images.map((image) => removeTempFile(image.path)));
            return res.json({ success: false, message: "Only image files are allowed in the images field" });
        }

        if (video && !video.mimetype?.startsWith("video/")) {
            await removeTempFile(video.path);
            return res.json({ success: false, message: "Only video files are allowed in the video field" });
        }

        let image_urls = [];
        if (images.length) {
            image_urls = await Promise.all(
                images.map((image) => uploadPostImage(image))
            );
        }

        let video_url = "";
        if (video) {
            video_url = await uploadPostVideo(video);
        }

        let post_type = "text";
        if (video_url) {
            post_type = content ? "text_with_video" : "video";
        } else if (image_urls.length) {
            post_type = content ? "text_with_image" : "image";
        }

        await Post.create({
            user: userId,
            content,
            image_urls,
            video_url,
            post_type,
        });

        return res.json({ success: true, message: "Post added successfully" });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

//Get Post
export const getFeedPosts = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        //User connections and followings
        const userIds = [userId, ...user.connections, ...user.following];
        const posts = await Post.find({ user: { $in: userIds } })
            .populate(postPopulateOptions)
            .sort({ createdAt: -1 });
        return res.json({ success: true, posts });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

//Like Post
export const likePost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { postId } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.json({ success: false, message: "Post not found" });
        }

        if (post.likes_count.includes(userId)) {
            post.likes_count = post.likes_count.filter(user => user !== userId);
            await post.save();
            return res.json({ success: true, message: "Post unliked" });
        } else {
            post.likes_count.push(userId);
            await post.save();
            return res.json({ success: true, message: "Post liked" });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

//Comment on Post
export const addCommentToPost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { postId } = req.body;
        const comment = req.body?.comment?.trim?.() ?? "";

        if (!comment) {
            return res.json({ success: false, message: "Comment cannot be empty" });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.json({ success: false, message: "Post not found" });
        }

        post.comments.push({
            user: userId,
            text: comment,
        });
        await post.save();

        const updatedPost = await getPopulatedPostById(postId);

        return res.json({
            success: true,
            message: "Comment added successfully",
            comments: updatedPost?.comments ?? [],
            commentsCount: updatedPost?.comments?.length ?? 0,
        });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

export const updateCommentOnPost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { postId, commentId } = req.body;
        const commentText = req.body?.comment?.trim?.() ?? "";

        if (!commentText) {
            return res.json({ success: false, message: "Comment cannot be empty" });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.json({ success: false, message: "Post not found" });
        }

        const comment = post.comments.id(commentId);

        if (!comment) {
            return res.json({ success: false, message: "Comment not found" });
        }

        if (comment.user !== userId) {
            return res.json({ success: false, message: "You can only edit your own comments" });
        }

        comment.text = commentText;
        await post.save();

        const updatedPost = await getPopulatedPostById(postId);

        return res.json({
            success: true,
            message: "Comment updated successfully",
            comments: updatedPost?.comments ?? [],
            commentsCount: updatedPost?.comments?.length ?? 0,
        });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

export const deleteCommentFromPost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { postId, commentId } = req.body;
        const post = await Post.findById(postId);

        if (!post) {
            return res.json({ success: false, message: "Post not found" });
        }

        const comment = post.comments.id(commentId);

        if (!comment) {
            return res.json({ success: false, message: "Comment not found" });
        }

        if (comment.user !== userId) {
            return res.json({ success: false, message: "You can only delete your own comments" });
        }

        post.comments.pull(commentId);
        await post.save();

        const updatedPost = await getPopulatedPostById(postId);

        return res.json({
            success: true,
            message: "Comment deleted successfully",
            comments: updatedPost?.comments ?? [],
            commentsCount: updatedPost?.comments?.length ?? 0,
        });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};
