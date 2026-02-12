import { Request, Response } from 'express';
import { PrismaClient} from '../generated/prisma/client';
import bcrypt from 'bcryptjs';
import {generateToken } from "../utils/jwt";


const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        // Validation basique
        if (!email || !password || !name) {
            return res.status(400).json({error: 'All fields are required' });
        }

        // Vérifier si l'utilisateur existe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                createdAt: true,
            },
        });

        // Générer le token
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
        });

        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Register error: ', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Trouver l'utilisateur
        const user = await prisma.user.findUnique({ where: { email }});
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials'});
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Générer le token
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
            token,
        });
    } catch (error) {
        console.error('Login error: ', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};