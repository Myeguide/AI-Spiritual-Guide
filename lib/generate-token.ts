import jwt from "jsonwebtoken";

interface SessionPayload {
    userId: string;
    phoneNumber: string;
}

const jwtSecret = process.env.JWT_SECRET as string;
export function generateToken(userId: string, phoneNumber: string) {
    // Create JWT payload
    const payload: SessionPayload = {
        userId,
        phoneNumber,
    };

    // Generate JWT token (expires in 30 days)
    const sessionToken = jwt.sign(payload, jwtSecret, {
        expiresIn: "30d"
    });
    return sessionToken;
}

export function verifyToken(token: string) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        return decoded.userId;
    } catch (err) {
        console.error("Invalid token:", err);
        return null;
    }
}