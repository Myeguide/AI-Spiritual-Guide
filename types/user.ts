export type LoggedInUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    age?: number;
    dob: Date;
    phoneNumber?: string;
    password: string;
    avatar?: string;
}