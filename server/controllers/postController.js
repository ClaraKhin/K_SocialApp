import imageKit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import fs from "fs";
import User from "../models/User.js";
import { getAuth } from "@clerk/express";

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

//Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const { content, post_type } = req.body;
        const images = req.files ?? [];

        let image_urls = [];
        if (images.length) {
            image_urls = await Promise.all(
                images.map((image) => uploadPostImage(image))
            );
        }

        await Post.create({
            user: userId,
            content,
            image_urls,
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
        const posts = await Post.find({ user: { $in: userIds } }).populate("user").sort({ createdAt: -1 });
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
