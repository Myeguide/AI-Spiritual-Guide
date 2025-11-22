import jwt from "jsonwebtoken";

interface SessionPayload {
    userId: string;
    age: number | null;
    phoneNumber: string;
}

const jwtSecret = process.env.JWT_SECRET as string;
export function generateToken(userId: string, age: number | null, phoneNumber: string) {
    // Create JWT payload
    const payload: SessionPayload = {
        userId,
        age,
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, age: number | null };
        return {
            userId: decoded.userId,
            age: decoded.age,
        };
    } catch (err) {
        console.error("Invalid token:", err);
        return null;
    }
}