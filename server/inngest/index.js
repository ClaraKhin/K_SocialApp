import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connections.js";
import sendEmail from "../configs/nodeMailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";


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


//Inggest function reminder when a new connection request is added
const sendNewConnectionReminder = inngest.createFunction(
    {
        id: "send-new-connection-reminder",
        triggers: [{ event: "app/connection-request" }],
    },
    async ({ event, step }) => {
        const { connectionId } = event.data;

        await step.run("send-connection-request-mail", async () => {
            const connection = await Connection.findById(connectionId).populate("from_user_id to_user_id");
            const subject = `👋🏻 New Connection Request`;
            const body = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${connection.to_user_id.full_name}</h2>
            <p>You have a new connection request from ${connection.from_user_id.full_name} - @${connection.from_user_id.username}</p>
            <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a></p>
            <br />
            <p>Thanks,<br />Connectify - Stay Connected</p>
            </div>
            `
            await sendEmail({ to: connection.to_user_id.email, subject, body })
        })

        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours in milliseconds
        await step.sleepUntil("wait-for-24-hours", in24Hours);
        await step.run("send-connection-request-reminder", async () => {
            const connection = await Connection.findById(connectionId).populate("from_user_id to_user_id");

            if (connection.status === "accepted") {
                return { message: "Already accepted" }
            }

            const subject = `👋🏻 New Connection Request`;
            const body = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${connection.to_user_id.full_name}</h2>
            <p>You have a new connection request from ${connection.from_user_id.full_name} - @${connection.from_user_id.username}</p>
            <p>Click <a href="${process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a></p>
            <br />
            <p>Thanks,<br />Connectify - Stay Connected</p>
            </div>
            `
            await sendEmail({ to: connection.to_user_id.email, subject, body })

            return { message: "Reminder sent" }
        })

    }
)

//Inngest function to delete story after 24 hours
const deleteStory = inngest.createFunction(
    {
        id: "story-delete",
        triggers: [{ event: "app/story.delete" }],
    },
    async ({ event, step }) => {
        const { storyId } = event.data;

        const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await step.sleepUntil("wait-for-24-hours", in24Hours);

        await step.run("delete-story", async () => {
            await Story.findByIdAndDelete(storyId);
            return { message: "Story deleted." }
        })

    }
)

const sendNotificationOfUnseenMessages = inngest.createFunction(
    {
        id: "send-unseen-messages-notification",
        triggers: [{ cron: "TZ=America/New_York 0 9 * * *" }],
    },//Every day at 9 AM New York time
    async ({ event, step }) => {
        const messages = await Message.find({ seen: false }).populate("to_user_id");
        const unseenCount = {}

        messages.map((message) => {
            unseenCount[message.to_user_id._id] = (unseenCount[message.to_user_id._id] || 0) + 1;
        })

        for (const userId in unseenCount) {
            const user = await User.findById(userId);
            const subject = `You have ${unseenCount[userId]} unseen messages`;
            const body = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hi ${user.full_name}!</h2>
            <p>You have ${unseenCount[userId]} unseen messages.</p>
            <p> Click <a href="${process.env.FRONTEND_URL}/messages" style="color: #10b981;">here</a> to view them. </p>
            <br />
            <p>Thanks,<br />Connectify - Stay Connected</p>
            </div>
            `
            await sendEmail({ to: user.email, subject, body })
        }
        return { message: "Notifications sent." }
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    sendNewConnectionReminder,
    deleteStory,
    sendNotificationOfUnseenMessages,
];
