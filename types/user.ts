export type LoggedInUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    age?: number;
    dob: "yyyy-MM-dd";
    phoneNumber?: string;
    password: string;
    avatar?: string;
}