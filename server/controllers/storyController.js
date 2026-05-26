import imageKit from "../configs/imageKit.js";
import Story from "../models/Story.js";
import fs from "fs";
import User from "../models/User.js";

//Add Story
export const addUserStory = async (req, res) => {
    try {

        const { userId } = req.auth();
        const { content, media_type, background_color } = req.body;
        const media = req.file;
        let media_url = "";

        //upload media to imagekit
        if (media_type === "image" || media_type === "video") {
            const fileBuffer = fs.readFileSync(media.path);
            const response = await imageKit.files.upload({
                file: fileBuffer,
                fileName: media.originalname,

            })
            media_url = response.url
        }

        //create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color,
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
        const { userId } = req.auth();
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