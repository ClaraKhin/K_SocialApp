import express from "express";
import { upload } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";
import { addPost, getFeedPosts, likePost } from "../controllers/postController.js";



const postRouter = express.Router();


postRouter.post('/add', protect, upload.fields([
    { name: "images", maxCount: 4 },
    { name: "video", maxCount: 1 },
]), addPost)
postRouter.get('/feed', protect, getFeedPosts)
postRouter.post('/like', protect, likePost)

export default postRouter;
