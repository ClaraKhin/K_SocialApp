import { getAuth } from "@clerk/express";

export const protect = (req, res, next) => {
    try {
        const auth = getAuth(req, { acceptsToken: "any" });
        const { userId } = auth;

        if (!userId) {
            const response = { success: false, message: "Unauthorized" };

            if (process.env.NODE_ENV !== "production") {
                response.debug = {
                    hasAuthorizationHeader: Boolean(req.headers.authorization),
                    tokenType: auth.tokenType ?? null,
                    isAuthenticated: auth.isAuthenticated ?? false,
                };
            }

            return res.status(401).json(response);
        }

        return next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ success: false, message: "Authentication failed" });
    }
};
