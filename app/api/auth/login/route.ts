import { generateToken } from "@/lib/generate-token";
import { UserService } from "@/lib/services/user.service";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcrypt-ts"

// ============================================================================
// TODO: Need to be clean use service from user service
// ============================================================================

interface LoginRequestBody {
    phoneNumber: string;
    password: string;
}

interface UserResponse {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string;
    email: string | null;
    age: number | null;
}

interface LoginSuccessResponse {
    success: true;
    message: string;
    token: string;
    user: UserResponse;
}

interface LoginErrorResponse {
    success: false;
    error: string;
    code?: string;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

// ============================================================================
// Constants
// ============================================================================

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/; // E.164 format

const SESSION_CONFIG = {
    cookieName: "session-token",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    path: "/",
} as const;

const ERROR_MESSAGES = {
    INVALID_PHONE: "Invalid phone number format. Use E.164 format (e.g., +911234567890)",
    USER_NOT_FOUND: "No account found with this phone number",
    MISSING_PHONE: "Phone number is required",
    INVALID_JSON: "Invalid request body",
    INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
    TOKEN_GENERATION_FAILED: "Failed to generate session token",
    DATABASE_ERROR: "Database operation failed",
    INVALID_PASSWORD: "Incorrect password"
} as const;

const ERROR_CODES = {
    INVALID_PHONE: "INVALID_PHONE_FORMAT",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    MISSING_PHONE: "MISSING_PHONE_NUMBER",
    INVALID_JSON: "INVALID_JSON_BODY",
    INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
    TOKEN_ERROR: "TOKEN_GENERATION_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    INVALID_PASSWORD: "INVALID_PASSWORD",
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates phone number format (E.164 standard)
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
function isValidPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== "string") {
        return false;
    }

    const trimmed = phoneNumber.trim();
    return PHONE_REGEX.test(trimmed);
}

/**
 * Normalizes phone number to consistent format
 * @param phoneNumber - Phone number to normalize
 * @returns Normalized phone number
 */
function normalizePhoneNumber(phoneNumber: string): string {
    // Remove all spaces and hyphens
    return phoneNumber.trim().replace(/[\s-]/g, "");
}

/**
 * Validates request body
 */
function validateRequestBody(body: object): {
    valid: boolean;
    phoneNumber?: string;
    password?: string;
    error?: { message: string; code: string };
} {
    if (!body || typeof body !== "object") {
        return {
            valid: false,
            error: {
                message: ERROR_MESSAGES.INVALID_JSON,
                code: ERROR_CODES.INVALID_JSON,
            },
        };
    }

    const { phoneNumber, password } = body as LoginRequestBody;

    if (!phoneNumber) {
        return {
            valid: false,
            error: {
                message: ERROR_MESSAGES.MISSING_PHONE,
                code: ERROR_CODES.MISSING_PHONE,
            },
        };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!isValidPhoneNumber(normalizedPhone)) {
        return {
            valid: false,
            error: {
                message: ERROR_MESSAGES.INVALID_PHONE,
                code: ERROR_CODES.INVALID_PHONE,
            },
        };
    }

    return {
        valid: true,
        phoneNumber: normalizedPhone,
        password,
    };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Creates and sets session cookie
 * @param userId - User ID
 * @param userAge - User Age
 * @param phoneNumber - User phone number
 * @returns Session token
 */
async function createSession(
    userId: string,
    age: number | null,
    phoneNumber: string
): Promise<string> {
    try {
        // Generate token
        const sessionToken = generateToken(userId, age, phoneNumber);
        if (!sessionToken) {
            throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
        }

        // Set cookie
        const cookieStore = await cookies();
        const isProduction = process.env.NODE_ENV === "production";
        cookieStore.set(SESSION_CONFIG.cookieName, sessionToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: SESSION_CONFIG.maxAge,
            path: SESSION_CONFIG.path,
        });

        return sessionToken;
    } catch (error) {
        console.error("[Login] Session creation error:", error);
        throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
    }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Creates error response
 */
function createErrorResponse(
    message: string,
    code: string,
    status: number
): NextResponse<LoginErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error: message,
            code,
        },
        { status }
    );
}

/**
 * Creates success response
 */
function createSuccessResponse(
    token: string,
    user: UserResponse
): NextResponse<LoginSuccessResponse> {
    return NextResponse.json(
        {
            success: true,
            message: "Login successful",
            token,
            user,
        },
        { status: 200 }
    );
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * POST /api/auth/login
 * 
 * Authenticates user with phone number and creates session
 * 
 * @param req - Next.js request object
 * @returns JSON response with login result
 * 
 * @example
 * POST /api/auth/login
 * Body: { "phoneNumber": "+911234567890" }
 */
export async function POST(req: NextRequest): Promise<NextResponse<LoginResponse>> {
    try {
        // Step 1: Parse request body
        let body: object;
        try {
            body = await req.json();
        } catch {
            return createErrorResponse(
                ERROR_MESSAGES.INVALID_JSON,
                ERROR_CODES.INVALID_JSON,
                400
            );
        }

        // Step 2: Validate request body
        const validation = validateRequestBody(body);
        if (!validation.valid || !validation.phoneNumber) {
            return createErrorResponse(
                validation.error!.message,
                validation.error!.code,
                400
            );
        }

        const { phoneNumber, password } = validation;

        // Step 3: Find user
        const user = await UserService.getUserByPhoneOrEmail(phoneNumber);

        if (!user) {
            return createErrorResponse(
                ERROR_MESSAGES.USER_NOT_FOUND,
                ERROR_CODES.USER_NOT_FOUND,
                404
            );
        }
        // verify password by decoding hashedPassword
        const verifyPassword = compareSync(password as string, user.password);
        if (!verifyPassword) {
            return createErrorResponse(
                ERROR_MESSAGES.INVALID_PASSWORD,
                ERROR_CODES.INVALID_PASSWORD,
                401
            )
        }

        // Step 4: Create session
        const sessionToken = await createSession(user.id, user.age, phoneNumber);
        return createSuccessResponse(sessionToken, user);

    } catch (error) {

        // Check if it's a known error
        if (error instanceof Error) {
            if (error.message === ERROR_MESSAGES.DATABASE_ERROR) {
                return createErrorResponse(
                    ERROR_MESSAGES.DATABASE_ERROR,
                    ERROR_CODES.DATABASE_ERROR,
                    503
                );
            }
            if (error.message === ERROR_MESSAGES.TOKEN_GENERATION_FAILED) {
                return createErrorResponse(
                    ERROR_MESSAGES.TOKEN_GENERATION_FAILED,
                    ERROR_CODES.TOKEN_ERROR,
                    500
                );
            }
        }

        // Generic error response
        return createErrorResponse(
            ERROR_MESSAGES.INTERNAL_ERROR,
            ERROR_CODES.INTERNAL_ERROR,
            500
        );
    }
}