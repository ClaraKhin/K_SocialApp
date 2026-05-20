import { Inngest } from "inngest";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "connectify-app" });

//Inggest function to save user data to database
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }],
    },
    async ({ event }) => {
        const { id, first_name, last_name, email_address, image_url } = event.data;

        let email = email_address[0].email_address;
        let username = email.split("@")[0];

        const user = await User.findOne({ username });

        if (user) {
            username = username + Math.floor(Math.random() * 1000);
        }

        await User.create({
            _id: id,
            email,
            full_name: `${first_name} ${last_name}`,
            profile_picture: image_url,
            username,
        });
    }
);


//Update User
const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }],
    },
    async ({ event }) => {
        const { id, first_name, last_name, email_address, image_url } = event.data;
        const updatedUserData = {
            email: email_address[0].email_address,
            full_name: `${first_name} ${last_name}`,
            profile_picture: image_url,

        }
        await User.findByIdAndUpdate(id, updatedUserData);
    }
);


//Inggest function 

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation
];