export type LoggedInUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    age?: number;
    dob: string;
    phoneNumber?: string;
    password: string;
    avatar?: string;
}