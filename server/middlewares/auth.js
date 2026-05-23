export const protect = async (req, res, next) => {
    try {
        const { userId } = await req.auth();

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        return next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ success: false, message: "Authentication failed" });
    }
};
