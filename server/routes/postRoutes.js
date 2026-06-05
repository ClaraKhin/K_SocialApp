import express from "express";
import { upload } from "../configs/multer.js";
import { protect } from "../middlewares/auth.js";
import {
    addCommentToPost,
    addPost,
    deleteCommentFromPost,
    getImageKitAuth,
    getFeedPosts,
    likePost,
    updateCommentOnPost,
} from "../controllers/postController.js";


const postRouter = express.Router();


postRouter.post('/add', protect, upload.fields([
    { name: "images", maxCount: 4 },
]), addPost)
postRouter.get('/imagekit-auth', protect, getImageKitAuth)
postRouter.get('/feed', protect, getFeedPosts)
postRouter.post('/like', protect, likePost)
postRouter.post('/comment', protect, addCommentToPost)
postRouter.post('/comment/update', protect, updateCommentOnPost)
postRouter.post('/comment/delete', protect, deleteCommentFromPost)


export default postRouter;



