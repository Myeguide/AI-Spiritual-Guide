import { z } from 'zod'

export const sendOTPSchema = z.object({
    phoneNumber: z
        .string({
            required_error: "Phone number is required", // custom message for missing
        })
        .trim()
        .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format"), // custom message for invalid format
});

export const verifyOTPSchema = z.object({
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    code: z.string().length(6, 'OTP must be 6 digits')
});

export const registerSchema = z.object({
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    code: z.string().length(6, 'OTP must be 6 digits'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().int().positive().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
