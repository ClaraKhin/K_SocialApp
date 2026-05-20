import e from "express";
import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('DB connected'));
        await mongoose.connect(`${process.env.MONGODB_URL}/connectify`);

    } catch (error) {
        console.log(error);
    }
}

export default connectDB;