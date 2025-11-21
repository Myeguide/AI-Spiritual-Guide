import { verifyToken } from "@/lib/generate-token";
import { NextRequest } from "next/server";

export function AuthMiddleware(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return { error: "Unauthorized - No token provided", status: 401 };
    }

    const verified = verifyToken(token);

    if (!verified) {
        return { error: "Invalid or expired token", status: 401 };
    }

    if (!verified.userId) {
        return { error: "Unauthorized - Invalid token", status: 401 };
    }

    return { userId: verified.userId, userAge: verified.age };

}