import { Response} from "express";
import { PrismaClient } from '../generated/prisma/client';
import { AuthRequest } from "../types";


const prisma = new PrismaClient();

// Créer une colonne
export const createColumn = async (req: AuthRequest, res: Response) => {
    try {
        const {name, projectId} = req.body;
        const userId = req.user!.id;

        if (!name || !projectId) {
            return res.status(400).json({error: 'name and projectId are required'});
        }

        // Vérifier l'accès au projet
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Obtenir le dernier ordre
        const lastColumn = await prisma.column.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' },
        });

        const newOrder = lastColumn ? lastColumn.order + 1 : 0;

        const column = await prisma.column.create({
            data: {
                name,
                projectId,
                order: newOrder,
            },
        });

        res.status(201).json(column);
    } catch (error) {
        console.error('Create column error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mettre a jour une colonne
export const updateColumn = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user!.id;

        const column = await prisma.column.findUnique({
            where : { id },
            include: { project: true },
        });

        if (!column) {
            return res.status(404).json({ error: 'Column not found' });
        }

        // Vérifier les permissions
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId: column.projectId,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const updatedColumn = await prisma.column.update({
            where: { id },
            data: { name },
        });

        res.json(updatedColumn);
    } catch (error) {
        console.error('Update column error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Supprimer une colonne
export const deleteColumn = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const column = await prisma.column.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });

        if (!column) {
            return res.status(404).json({ error: 'Column not found' });
        }

        // Vérifier les permissions
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId: column.projectId,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Empecher la suppression si la colonne contient des taches
        if (column._count.tasks > 0) {
            return res.status(400).json({
                error: 'Cannot delete column with tasks. Move or delete tasks first.',
            });
        }

        await prisma.column.delete({
            where: { id },
        });

        res.json({ message: 'Column deleted successfully' });
    } catch (error) {
        console.error('Delete column error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Réorganiser les colonnes
export const reorderColumns = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { columnOrders } = req.body;
        const userId = req.user!.id;

        if (!Array.isArray(columnOrders)) {
            return res.status(400).json({ error: 'columnOrders must be an array' });
        }

        // Vérifier les permissions
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Insufficient permessions' });
        }

        // Mettre à jour les ordres
        await prisma.$transaction(
            columnOrders.map((col: { id: string, order: number }) =>
                prisma.column.update({
                    where: { id: col.id },
                    data: { order: col.order },
                })
            )
        );

        const updatedColumns = await prisma.column.findMany({
            where: { projectId },
            orderBy: { order: 'asc' },
        });

        res.json(updatedColumns);
    } catch (error) {
        console.error('Reorder columns error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
