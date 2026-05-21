import { Inngest } from "inngest";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "connectify-app" });

const getPrimaryEmail = (userData) => {
    const primaryEmail =
        userData.email_addresses?.find(
            (email) => email.id === userData.primary_email_address_id
        ) ?? userData.email_addresses?.[0];

    return primaryEmail?.email_address;
};

const buildFullName = ({ first_name, last_name, id }) => {
    const fullName = [first_name, last_name].filter(Boolean).join(" ").trim();
    return fullName || `user-${id.slice(-6)}`;
};

const buildUsernameBase = (email, id) => {
    const normalized = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");

    return normalized || `user${id.slice(-6)}`;
};

const resolveUniqueUsername = async (baseUsername, currentUserId) => {
    let candidate = baseUsername;
    let suffix = 1;

    while (true) {
        const existingUser = await User.findOne({ username: candidate });

        if (!existingUser || existingUser._id === currentUserId) {
            return candidate;
        }

        candidate = `${baseUsername}${suffix}`;
        suffix += 1;
    }
};

const upsertUserFromClerk = async (userData) => {
    const email = getPrimaryEmail(userData);

    if (!email) {
        throw new Error(`No email address found for Clerk user ${userData.id}`);
    }

    const existingUser = await User.findById(userData.id);
    const username =
        existingUser?.username ??
        await resolveUniqueUsername(buildUsernameBase(email, userData.id), userData.id);

    await User.findByIdAndUpdate(
        userData.id,
        {
            _id: userData.id,
            email,
            full_name: buildFullName(userData),
            profile_picture: userData.image_url ?? "",
            username,
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

//Inggest function to save user data to database
const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-from-clerk",
        triggers: [{ event: "clerk/user.created" }],
    },
    async ({ event }) => {
        await upsertUserFromClerk(event.data);
        console.log(`[inngest] Synced created Clerk user ${event.data.id}`);
    }
);


//Update User
const syncUserUpdation = inngest.createFunction(
    {
        id: "update-user-from-clerk",
        triggers: [{ event: "clerk/user.updated" }],
    },
    async ({ event }) => {
        await upsertUserFromClerk(event.data);
        console.log(`[inngest] Synced updated Clerk user ${event.data.id}`);
    }
);

//Delete User
const syncUserDeletion = inngest.createFunction(
    {
        id: "delete-user-from-clerk",
        triggers: [{ event: "clerk/user.deleted" }],
    },
    async ({ event }) => {
        const { id } = event.data;
        await User.findByIdAndDelete(id);
        console.log(`[inngest] Deleted Clerk user ${id}`);
    }
);


//Inggest function 

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
];
