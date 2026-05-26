import imageKit from "../configs/imageKit";
import Post from "../models/Post";
import fs from "fs";
import User from "../models/User";

//Add Post
export const addPost = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { content, post_type } = req.body;
        const images = req.files;

        const image_urls = [];
        if (images.length) {
            image_urls = await Promise.all(
                images.map(async (image) => {
                    const fileBuffer = fs.readFileSync(image.path);
                    const rsponse = await imageKit.upload({
                        file: fileBuffer,
                        fileName: image.originalname,
                        folder: "posts",
                    })

                    const url = imageKit.url({
                        path: response.filePath,
                        transformation: [
                            { quality: "auto" },
                            { format: "webp" },
                            { width: "1280" }

                        ]
                    })
                    return url;

                })
            )
        }
        await Post.create({
            user: userId,
            content,
            image_urls,
            post_type
        })

        return res.json({ success: true, message: "Post added successfully" });


    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get Post
export const getFeedPosts = async (req, res) => {
    try {

        const { userId } = req.auth();
        const user = await User.findById(userId);

        //User connections and followings
        const userIds = [userId, ...user.connections, ...user.followings];
        const posts = await Post.find({ user: { $in: userIds } }).populate("user").sort({ createdAt: -1 });
        return res.json({ success: true, posts });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Like Post
export const likePost = async (req, res) => {
    try {

        const { userId } = req.auth();
        const { postId } = req.body;
        const post = await Post.findById(postId);

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
}