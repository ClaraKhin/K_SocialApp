import User from "../models/User.js";
import fs from "fs";
import imageKit from "../configs/imageKit.js";
import Connection from "../models/Connections.js";
import Post from "../models/Post.js";
import { inngest } from "../inngest/index.js";
import { getAuth } from "@clerk/express";

const removeTempFile = async (filePath) => {
    if (!filePath) {
        return;
    }

    await fs.promises.unlink(filePath).catch(() => null);
};

const uploadAndTransformImage = async (file, transformation) => {
    try {
        const response = await imageKit.files.upload({
            file: fs.createReadStream(file.path),
            fileName: file.originalname,
        });

        const src = response.url ?? response.filePath;
        if (!src) {
            throw new Error("ImageKit upload did not return a file URL");
        }

        return imageKit.helper.buildSrc({
            src,
            urlEndpoint: response.url ? undefined : process.env.IMAGEKIT_URL_ENDPOINT,
            transformation,
        });
    } finally {
        await removeTempFile(file.path);
    }
};

// Get user data using userId
export const getUserData = async (req, res) => {
    try {
        const { userId } = getAuth(req);
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        return res.json({ success: true, user });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Update user
export const updateUserData = async (req, res) => {
    try {
        const { userId } = getAuth(req);
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
            updatedData.profile_picture = await uploadAndTransformImage(profile, [
                { quality: "auto" },
                { format: "webp" },
                { width: "512" },
            ]);
        }
        if (cover) {
            updatedData.cover_photo = await uploadAndTransformImage(cover, [
                { quality: "auto" },
                { format: "webp" },
                { width: "1280" },
            ]);
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
        const { userId } = getAuth(req);
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
        const { userId } = getAuth(req);
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
        const { userId } = getAuth(req);
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

//Send Connection request
export const sendConnectionRequest = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const { id } = req.body;

        //check if user has sent more than 20 connection requests in the last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours in milliseconds
        const connectionRequests = await Connection.find({
            from_user_id: userId,
            createdAt: { $gte: last24Hours },
        })

        if (connectionRequests.length >= 20) {
            return res.json({ success: false, message: "You have sent more than 20 requests in the last 24 hours." })
        }

        const connection = await Connection.findOne({
            $or: [
                { from_user_id: userId, to_user_id: id },
                { from_user_id: id, to_user_id: userId }
            ]
        })

        if (!connection) {
            const newConnection = await Connection.create({
                from_user_id: userId,
                to_user_id: id
            })

            await inngest.send({
                name: "app/connection-request",
                data: { connectionId: newConnection._id }
            })

            return res.json({ success: true, message: "Connection request sent successfully" });
        } else if (connection && connection.status === "accepted") {
            return res.json({ success: false, message: "You are already connected with this user" });
        }

        return res.json({ success: false, message: "Connection request pending" });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get User Connections
export const getUserConnections = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const user = await User.findById(userId).populate("connections followers following");
        const connections = user.connections;
        const followers = user.followers;
        const following = user.following;

        const pendingConnections = (await Connection.find({ to_user_id: userId, status: "pending" }).populate("from_user_id")).map((connection) => connection.from_user_id);


        return res.json({ success: true, connections, followers, following, pendingConnections });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Accept Connection Request
export const acceptConnectionRequest = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const { id } = req.body;
        const connection = await Connection.findOne({
            from_user_id: id, to_user_id: userId
        })

        if (!connection) {
            return res.json({ success: false, message: "Connection request not found" });
        }

        const user = await User.findById(userId);
        user.connections.push(id);
        await user.save();

        const toUser = await User.findById(id);
        toUser.connections.push(userId);
        await toUser.save();

        connection.status = "accepted";
        await connection.save();

        return res.json({ success: true, message: "Connection request accepted successfully" });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get User Profiles
export const getUserProfiles = async (req, res) => {
    try {

        const { profileId } = req.body;
        const profile = await User.findById(profileId);
        if (!profile) {
            return res.json({ success: false, message: "User not found" });
        }

        const posts = await Post.find({ user: profileId }).populate("user");

        return res.json({ success: true, profile, posts });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }

}
