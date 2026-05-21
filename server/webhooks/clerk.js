import { Webhook } from "svix";
import { inngest } from "../inngest/index.js";

export const clerkWebhookHandler = async (req, res) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!signingSecret) {
        console.error("[clerk-webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET");
        return res.status(500).json({ success: false, message: "Webhook signing secret is not configured." });
    }

    const svixHeaders = {
        "svix-id": req.get("svix-id"),
        "svix-timestamp": req.get("svix-timestamp"),
        "svix-signature": req.get("svix-signature"),
    };

    if (!svixHeaders["svix-id"] || !svixHeaders["svix-timestamp"] || !svixHeaders["svix-signature"]) {
        return res.status(400).json({ success: false, message: "Missing Svix headers." });
    }

    let payload;

    try {
        const webhook = new Webhook(signingSecret);
        payload = webhook.verify(req.body.toString(), svixHeaders);
    } catch (error) {
        console.error("[clerk-webhook] Signature verification failed", error);
        return res.status(400).json({ success: false, message: "Invalid webhook signature." });
    }

    try {
        await inngest.send({
            name: `clerk/${payload.type}`,
            data: payload.data,
        });

        console.log(`[clerk-webhook] Forwarded ${payload.type} event to Inngest`);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("[clerk-webhook] Failed to forward event to Inngest", error);
        return res.status(500).json({ success: false, message: "Failed to queue webhook event." });
    }
};
