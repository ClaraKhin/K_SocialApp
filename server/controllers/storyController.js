import imageKit from "../configs/imageKit.js";
import Story from "../models/Story.js";
import fs from "fs";
import User from "../models/User.js";
import { inngest } from "../inngest/index.js";
import { getAuth } from "@clerk/express";

const removeTempFile = async (filePath) => {
    if (!filePath) {
        return;
    }

    await fs.promises.unlink(filePath).catch(() => null);
};

const uploadStoryMedia = async (media) => {
    try {
        const response = await imageKit.files.upload({
            file: fs.createReadStream(media.path),
            fileName: media.originalname,
            folder: "stories",
        });

        return response.url ?? response.filePath ?? "";
    } finally {
        await removeTempFile(media.path);
    }
};

//Add Story
export const addUserStory = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const { content, media_type, background_color } = req.body;
        const media = req.file;
        let media_url = "";

        if (media_type === "text" && !content?.trim()) {
            return res.json({ success: false, message: "Please add some text to create a story" });
        }

        if ((media_type === "image" || media_type === "video") && !media) {
            return res.json({ success: false, message: "Please upload a photo or video for this story" });
        }

        if (media_type === "image" && media && !media.mimetype?.startsWith("image/")) {
            await removeTempFile(media.path);
            return res.json({ success: false, message: "Only image files are allowed for photo stories" });
        }

        if (media_type === "video" && media && !media.mimetype?.startsWith("video/")) {
            await removeTempFile(media.path);
            return res.json({ success: false, message: "Only video files are allowed for video stories" });
        }

        //upload media to imagekit
        if (media_type === "image" || media_type === "video") {
            media_url = await uploadStoryMedia(media);
        }

        //create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color,
        })

        //Schedule story deletion after 24 hours using Inngest
        await inngest.send({
            name: "app/story.delete",
            data: { storyId: story._id }
        })

        return res.json({ success: true, data: story });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get User Stories
export const getStories = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findById(userId);

        //User Connections and Followings
        const userIds = [userId, ...user.connections, ...user.following];

        const stories = await Story.find({ user: { $in: userIds } }).populate("user").sort({ createdAt: -1 });

        return res.json({ success: true, stories });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}
