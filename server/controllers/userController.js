import User from "../models/User";
import fs from "fs";
import imageKit from "../configs/imageKit";
import { response } from "express";

// Get user data using userId
export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth();
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        return res.json({ success: true, data: user });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Update user
export const updateUserData = async (req, res) => {
    try {
        const { useId } = req.auth();
        const { username, bio, location, full_name } = req.body;
        const tempUser = await User.findById(useId);
        !username && (username = tempUser.username);
        if (tempUser.username !== username) {
            const user = User.findOne({ username });
            if (user) {
                username = tempUser.username;
            }
        }

        const updatedData = {
            username,
            bio,
            location,
            full_name,
        };

        const profile = req.files.profile && req.files.profile[0]
        const cover = req.files.cover && req.files.cover[0]

        if (profile) {
            const buffer = fs.readFileSync(profile.path);
            const respond = await imageKit.upload({
                file: buffer,
                fileName: profile.originalname,

            })

            const url = imageKit.url(
                {
                    path: response.filePath,
                    transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '512' }],
                }
            )

            updatedData.profile_picture = url;
        }
        if (cover) {
            const buffer = fs.readFileSync(cover.path);
            const respond = await imageKit.upload({
                file: buffer,
                fileName: cover.originalname,

            })

            const url = imageKit.url(
                {
                    path: response.filePath,
                    transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '1280' }],
                }
            )

            updatedData.cover_photo = url;
        }

        const user = await User.findByIdAndUpdate(useId, updatedData, { new: true });

        return res.json({ success: true, user, message: "User updated successfully" });

    }
    catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}
