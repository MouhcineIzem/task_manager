import { Response } from 'express';
import { AuthRequest } from "../types";
import { PrismaClient } from '../generated/prisma/client';
import { io } from '../index';
import { emitToProject } from "../socket/socketHandler";


const prisma = new PrismaClient();

// Helper : vérifier l'accès projet
const checkProjectAccess = async (projectId: string, userId: string) => {
    const member = await prisma.projectMember.findFirst({
        where: {
            projectId,
            userId,
        },
    });
    return !!member;
};

// Créer une tache
export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const {title, description, columnId, assigneeId, priority, dueDate} = req.body;
        const userId = req.user!.id;

        if (!title || !columnId) {
            return res.status(400).json({error: 'Title and columnsId are required'});
        }

        //
        const column = await prisma.column.findUnique({
            where: {id: columnId},
            include: {project: true},
        });

        if (!column) {
            return res.status(404).json({error: 'Column not found'});
        }

        const hasAccess = await checkProjectAccess(column.projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({error: 'Access denied'});
        }

        if (assigneeId) {
            const assigneeIsMember = await checkProjectAccess(column.projectId, assigneeId);
            if (!assigneeIsMember) {
                return res.status(400).json({error: 'Assignee is not a project member'});
            }
        }

        // Obtenir le dernier ordre dans la conlonne
        const lastTask = await prisma.task.findFirst({
            where: {columnId},
            orderBy: {order: 'desc'},
        });

        const newOrder = lastTask ? lastTask.order + 1 : 0;

        const task = await prisma.task.create({
            data: {
                title,
                description,
                columnId,
                assigneeId,
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : null,
                order: newOrder,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: {comments: true},
                },
            },
        });

        // Emettre l'événement Socket
        emitToProject(io, column.projectId, 'task:created', {
            task,
            projectId: columnn.projectId,
            userId,
        });

        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};


// Récupérer une tache par ID
export const getTaskById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include: {
                        project: true,
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
                comments: {
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
                        createdAt: 'desc',
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Vérifier l'accès au projet
        const hasAcces = await checkProjectAccess(task.column.projectId, userId);
        if (!hasAcces) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(task);
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mettre à jour une tache
export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, assigneeId, priority, dueDate } = req.body;
        const userId = req.user!.id;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Vérifier l'acces
        const hasAccess = await checkProjectAccess(task.column.projectId, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Si assigneeId, vérifier qui'il est membre
        if (assigneeId) {
            const assigneeIsMember = await checkProjectAccess(task.column.projectId, assigneeId);
            if (!assigneeIsMember) {
                return res.status(400).json({ error: 'Assignee is not a project member' });
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                title,
                description,
                assigneeId: assigneeId === null ? null : assigneeId,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
        });

        // Emettre l'événement Socket
        emitToProject(io, task.column.project.id, 'task:updated', {
            task: updatedTask,
            projectId: task.column.project.id,
            userId,
        });

        res.json(updatedTask);

    } catch (error) {
        console.error('Update Task error ', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Supprimer une tache
export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        if (!task) {
            res.status(404.).json({ error: 'Task not found' });
        }

        // Vérifier l'accès
        const hasAccess = await checkProjectAccess(task.column.projectId, userId);
        if (!task) {
            res.status(403).json({ error: 'Acess denied' });
        }

        await prisma.task.delete({
            where: { id },
        });

        // Emettre l'événement Socket
        emitToProject(io, projectId, 'task:deleted', {
            taskId: id,
            projectId,
        });

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Déplcer une tache (drag & drop)
export const moveTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { columnId, order } = req.body;
        const userId = req.user!.id;

        if (!columnId || order === undefined) {
            return res.status(400).json({ error: 'columnsId and order are required' });
        }

        // Récupérer la tache
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
        }

        // Vérifier l'acces
        const hasAccess = await checkProjectAccess(task.column.project.id, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acces denied' });
        }

        // Vérifier que la nouvelle colone appartient au même projet
        const newColumn = await prisma.column.findUnique({
            where: { id: columnId },
        });

        if (!newColumn || newColumn.projectId !== task.column.project.id) {
            return res.status(400).json({ error: 'Invalid column' });
        }

        const oldColumnId = task.columnId;
        const oldOrder = task.order;

        // Transaction pour gérer les ordres
        await prisma.$transaction(async (tx) => {
            // Si on change de colonne
            if (oldColumnId !== columnId){
                // Réorganiser l'ancienne colonne
                await tx.task.updateMany({
                    where: {
                        columnId: oldColumnId,
                        order: { gt: oldOrder },
                    },
                    data: {
                        order: { decrement: 1 },
                    },
                });

                // Réorganiser la nouvelle colonne
                await tx.task.updateMany({
                    where: {
                        columnId,
                        order: { gte: order },
                    },
                    data: {
                        order: { increment: 1 },
                    },
                });
            } else {
                // Meme colonne, réorganiser
                if (order > oldOrder) {
                    await tx.task.updateMany({
                        where: {
                            columnId,
                            order: { gt: oldOrder, lte: order },
                        },
                        data: {
                            order: { decrement: 1 },
                        },
                    });
                } else if (order < oldOrder) {
                    await tx.task.updateMany({
                        where: {
                            columnId,
                            order: { gte: order, lt: oldOrder },
                        },
                        data: {
                            order: { increment: 1 },
                        },
                    });
                }
            }

            // Mettre à jour la tache
            await tx.task.update({
                where: { id },
                data: {
                    columnId,
                    order,
                },
            });
        });

        // Récupérer la tache mise à jour
        const updateTask = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
        });

        // Emettre l'événement Socket
        emitToProject(io, task.column.project.id, 'task:moved', {
            taskId: id,
            oldColumnId,
            newColumnId: columnId,
            newOrder: order,
            projectId: task.column.project.id,
            userId,
        });

        res.json(updateTask);
    } catch (error) {
        console.error('Delete task error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Ajouter un tag à une tache
export const addTagTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { tagId } = req.body;
        const userId = req.user!.id;

        if (!tagId) {
            return res.status(400).json({error: 'tagId is required' });
        }

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const hasAccess = await checkProjectAccess(task.column.project.id, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Vérifier que le tag existe
        const tag = await prisma.tag.findUnique({
            where: { id: tagId },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Ajouter le tag
        await prisma.taskTag.create({
            data: {
                taskId: id,
                tagId,
            },
        });

        // Récupérer la tache mise à jour
        const updateTask = await prisma.task.findUnique({
            where : { id },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
        });

        res.json(updateTask);
    } catch (error) {
        console.error('Add tag error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Retirer un tag f'une tache
export const removeTagFromTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id, tagId } = req.params;
        const userId = req.user!.id;

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                column: {
                    include : {
                        project: true,
                    },
                },
            },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const hasAccess = await checkProjectAccess(task.column.project.id, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acces denied' });
        }

        await prisma.taskTag.delete({
            where: {
                taskId_tagId: {
                    taskId: id,
                    tagId,
                },
            },
        });

        const updateTask = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: { comments: true },
                },
            },
        });

        res.json(updateTask);
    } catch (error) {
        console.error('Remove tag error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
