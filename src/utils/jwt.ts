import jwt from 'jsonwebtoken';
import { UserPayload } from "../types";


const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';


export const generateToken = (payload: UserPayload): string => {
    // @ts-ignore
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


export const verifyToken = (token : string) : UserPayload => {
    // @ts-ignore
    return jwt.verify(token, JWT_SECRET) as UserPayload;
};

