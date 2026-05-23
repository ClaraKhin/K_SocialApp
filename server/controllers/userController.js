import User from "../models/User.js";
import fs from "fs";
import imageKit from "../configs/imageKit.js";

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
        const { userId } = req.auth();
        let { username, bio, location, full_name } = req.body;
        const tempUser = await User.findById(userId);

        if (!tempUser) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!username) {
            username = tempUser.username;
        }

        if (tempUser.username !== username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                username = tempUser.username;
            }
        }

        const updatedData = {
            username,
            bio: bio ?? tempUser.bio,
            location: location ?? tempUser.location,
            full_name: full_name ?? tempUser.full_name,
        };

        const profile = req.files?.profile?.[0];
        const cover = req.files?.cover?.[0];

        if (profile) {
            const buffer = fs.readFileSync(profile.path);
            const response = await imageKit.upload({
                file: buffer,
                fileName: profile.originalname,
            });

            const url = imageKit.url({
                path: response.filePath,
                transformation: [{ quality: "auto" }, { format: "webp" }, { width: "512" }],
            });

            updatedData.profile_picture = url;
        }
        if (cover) {
            const buffer = fs.readFileSync(cover.path);
            const response = await imageKit.upload({
                file: buffer,
                fileName: cover.originalname,
            });

            const url = imageKit.url({
                path: response.filePath,
                transformation: [{ quality: "auto" }, { format: "webp" }, { width: "1280" }],
            });

            updatedData.cover_photo = url;
        }

        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });

        return res.json({ success: true, user, message: "User updated successfully" });

    }
    catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Find Users using username, email, location, name
export const discoverUsers = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { input } = req.body;
        const allUsers = await User.find({
            $or: [
                { username: new RegExp(input, 'i') },
                { email: new RegExp(input, 'i') },
                { location: new RegExp(input, 'i') },
                { full_name: new RegExp(input, 'i') }
            ]
        });

        const filterUsers = allUsers.filter((user) => user._id.toString() !== userId);
        return res.json({ success: true, users: filterUsers });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Follow user
export const followUser = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { id } = req.body;

        const user = await User.findById(userId);
        if (user.following.includes(id)) {
            return res.json({ success: false, message: "You are already following this user" });
        }

        user.following.push(id);
        await user.save();

        const toUser = await User.findById(id);
        toUser.followers.push(userId);
        await toUser.save();

        return res.json({ success: true, message: "Now You're following this user" });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Unfollow user
export const unfollowUser = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { id } = req.body;
        const user = await User.findById(userId);
        user.following = user.following.filter((user) => user !== id);

        await user.save();
        const toUser = await User.findById(id);
        toUser.followers = toUser.followers.filter((user) => user !== userId);
        await toUser.save();
        return res.json({ success: true, message: "You are no longer following this user" });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}
