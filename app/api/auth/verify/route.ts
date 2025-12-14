import { verifyToken } from "@/lib/generate-token";
import { NextRequest, NextResponse } from "next/server";

interface VerifyResponse {
    success: boolean;
    valid: boolean;
    message: string;
    user?: {
        userId: string;
        age: number | null;
    };
}

/**
 * GET /api/auth/verify
 * 
 * Verifies if the provided JWT token is still valid (not expired)
 * This endpoint should be called on app load to check session validity
 */
export async function GET(req: NextRequest): Promise<NextResponse<VerifyResponse>> {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.get("Authorization");
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({
                success: true,
                valid: false,
                message: "No token provided",
            }, { status: 200 });
        }

        const token = authHeader.split(" ")[1];
        
        if (!token) {
            return NextResponse.json({
                success: true,
                valid: false,
                message: "Invalid token format",
            }, { status: 200 });
        }

        // Verify the token (this will fail if expired or invalid)
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return NextResponse.json({
                success: true,
                valid: false,
                message: "Token expired or invalid",
            }, { status: 200 });
        }

        // Token is valid
        return NextResponse.json({
            success: true,
            valid: true,
            message: "Session is valid",
            user: {
                userId: decoded.userId,
                age: decoded.age,
            },
        }, { status: 200 });

    } catch (error) {
        console.error("[Verify Session] Error:", error);
        return NextResponse.json({
            success: false,
            valid: false,
            message: "Failed to verify session",
        }, { status: 500 });
    }
}

