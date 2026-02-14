import { Response } from "express";
import { PrismaClient } from '../generated/prisma/client';
import { AuthRequest } from "../types";
import {type} from "node:os";

const prisma = new PrismaClient();

// Créer un tag global
export const createTag = async (req: AuthRequest, res: Response) => {
    try {
        const { name, color } = req.body;

        if (!name || !color) {
            return res.status(400).json({ error: 'name and color are required' });
        }

        // Vérifier si le tag existe déja
        const existingTag = await prisma.tag.findUnique({
            where: { name },
        });

        if (existingTag) {
            return res.status(400).json({ error: 'Tag with this name already exists' });
        }

        const tag = await prisma.tag.create({
            data: {
                name,
                color,
            },
        });

        res.status(201).json(tag);
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Récupérer tous les tags
export const getAllTags = async (req: AuthRequest, res: Response) => {
    try {
        const tags = await prisma.tag.findMany({
            include: {
                _count: {
                    select: { tasks?: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        res.json(tags);
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Récupérer un tag par ID
export const getTagById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const tag = await prisma.tag.findUnique({
            where : { id },
            include: {
                tasks: {
                    include: {
                        task: {
                            include: {
                                column: {
                                    include: {
                                        projectId: true,
                                    },
                                },
                                assignee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        res.json(tag);
    } catch(error) {
        console.error('Get tag error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mettre à jour un tag
export const updateTag = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {name, color } = req.body;

        const tag = await prisma.tag.findUnique({
            where: { id },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Si on change le nom, vérifier qu'il n'existe pas déja
        if (name && name !== tag.name) {
            const existingTag = await prisma.tag.findUnique({
                where: { id },
            });

            if (existingTag) {
                return res.status(400).json({ error: 'Tag with this name already exists' });
            }
        }

        const updateTag = await prisma.tag.update({
            where: { id },
            data: {
                name,
                color,
            },
        });

        res.json(updateTag);
    } catch (error) {
        console.error('Update tag error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// SUpprimer un tag
export const deleteTag = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const tag = await prisma.tag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Optionnel: empecher la suppression si le tag est utilisé
        if (tag._count.tasks > 0) {
            return res.status(400).json({
                error: `Cannot delete tag. It is used by ${tag._count.tasks} task(s)`,
            });
        }

        await prisma.tag.delete({
            where: { id },
        });

        res.json({ message : 'Tag deleted successfully' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Rechercher des tags par nom
export const searchTags = async (req: AuthRequest, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const tags = await prisma.tag.findMany({
            where: {
                name: {
                    contains: q,
                    mode: 'insensitive',
                },
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            task: 10,
        });

        res.json(tags);
    } catch (error) {
        console.error('Search tags error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};