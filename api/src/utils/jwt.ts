import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export const signToken = (payload: object) => jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: '7d' });
export const verifyToken = (token: string) => jwt.verify(token, CONFIG.JWT_SECRET) as any;
