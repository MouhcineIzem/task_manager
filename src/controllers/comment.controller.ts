import { Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { AuthRequest } from "../types";
import {emitToProject} from "../socket/socketHandler";


const prisma = new PrismaClient();

// Helper : vérifier l'accès à la tache
const checkTaskAccess = async (taskId: string, userId: string) => {
    const task = await prisma.task.findUnique({
        where : { id: taskId },
        include: {
            column: {
                include: {
                    project: {
                        include: {
                            members: {
                                where: { userId },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!task) return null;
    return task.column.project.members.lenth > 0 ? task : null;
};

// Créer un commentaire
export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId, content } = req.body;
        const userId = req.user!.id;

        if (!taskId || !content) {
            return res.status(400).json({ error: 'task and content are required' });
        }

        // Vérifier l'access
        const task = await checkTaskAccess(taskId, userId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found or access denied' });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                taskId,
                authorId: userId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        // Emettre l'événement Socket
        emitToProject(io, task.column.project.id, 'comment:created', {
            comment,
            taskId,
            projectId: task.column.project.id,
            userId,
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Récupérer les commentaires d'une tache
export const getTaskComments = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const userId = req.user!.id;

        const task = await checkTaskAccess(taskId, userId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found or access denied' });
        }

        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        res.json(comments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mettre à jour un commentaire
export const updateComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user!.id;

        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }

        const comment = await prisma.comment.findUnique({
            where: { id },
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Seul l'auteur peut modifier son commentaire
        if (comment.authorId !== userId) {
            return res.status(403).json({ error: 'You can only edit your own comments' });
        }

        const updatedComment = await prisma.comment.update({
            where: { id },
            data: { content },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json(updatedComment);
    } catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Supprimer un commentaire
export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const comment = await prisma.comment.findUnique({
            where: { id },
            include: {
                task: {
                    include: {
                        column: {
                            include: {
                                project: {
                                    include: {
                                        members: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // L'auteur peu tsupprimer, ou un OWNER/ADMIN du projet
        const isAuthor = comment.authorId === userId;
        const isAdmin = comment.task.column.project.members.some(
            (m) => m.userId === userId && (m.role === 'OWNER' || m.role === 'ADMIN')
        );

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        await prisma.comment.delete({
            where: { id },
        });

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};