import imageKit from "../configs/imageKit.js";
import Message from "../models/Message.js";
import fs from "fs";
import { getAuth } from "@clerk/express";


//Create an empty object to store server-side event connections
const connections = {};

const removeTempFile = async (filePath) => {
    if (!filePath) {
        return;
    }

    await fs.promises.unlink(filePath).catch(() => null);
};

const uploadMessageImage = async (image) => {
    try {
        const response = await imageKit.files.upload({
            file: fs.createReadStream(image.path),
            fileName: image.originalname,
            folder: "messages",
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

//controller function for the server-side endpoints
export const sseController = (req, res) => {
    const { userId } = req.params;
    console.log('New Client connected: ', userId);

    //Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    //Add the client's response object to the connections object
    connections[userId] = res;

    //Send an initial event to client
    res.write('log: Connected to SSE server\n\n');

    //Handle client disconnect
    req.on('close', () => {
        //Remove the client's response object from the conneciotns array
        delete connections[userId];
        console.log('Client disconnected: ', userId);

    })
}

//Send Message
export const sendMessage = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const { to_user_id, text } = req.body;
        const image = req.file;
        let media_url = "";

        let message_type = image ? "image" : "text";

        if (message_type === "image") {
            media_url = await uploadMessageImage(image);
        }

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url,
        })

        //Send the message to the recipient if they are connected to SSE
        const messageWithUserData = await Message.findById(message._id).populate("from_user_id");

        if (connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`);

        }

        return res.json({ success: true, data: message });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get Chat Messages
export const getChatMessages = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const { to_user_id } = req.query;

        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id },
                { from_user_id: to_user_id, to_user_id: userId }
            ]
        }).sort({ createdAt: -1 })

        await Message.updateMany({
            from_user_id: to_user_id,
            to_user_id: userId,
        }, { seen: true })
        return res.json({ success: true, data: messages });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}

//Get user recent messages
export const getRecentMessages = async (req, res) => {
    try {

        const { userId } = getAuth(req);
        const messages = await Message.find({ to_user_id: userId }).populate("from_user_id to_user_id").sort({ createdAt: -1 });

        return res.json({ success: true, data: messages });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}
