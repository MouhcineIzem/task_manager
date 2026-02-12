import { Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { AuthRequest } from "../types";
import * as wasi from "node:wasi";



const prisma = new PrismaClient();


// Créer un nouveau project
export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description } = req.body;
        const userId = req.user!.id;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required'});
        }

        // Créer le projet avec l'utilisateur comme OWNER
        const project = await prisma.project.create({
            data: {
                name,
                description,
                members: {
                    create: {
                        userId,
                        role: 'OWNER',
                    },
                },
                // Créer des colonnes par défaut
                columns: {
                    create: [
                        { name: 'To Do', order: 0 },
                        { name: 'In progress', order: 1 },
                        { name: 'Done', order: 2 },
                    ],
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            },
                        },
                    },
                },
                columns: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
};

// Récupérer tous les projects de l'utilisateur
export const getMyProjects = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const projects = await prisma.project.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            },
                        },
                    },
                },
                columns: {
                    orderBy: { order: 'asc' },
                    include: {
                        _count: {
                            select: { tasks: true },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(projects);
    } catch (error) {
        console.error('Get Project error:', error);
        res.status(500).json({ error: 'Internal server error'})
    }
}

// Récupérer un project par ID
export const getProjectById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const project = await prisma.project.findFirst({
            where: {
                id,
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true
                            },
                        },
                    },
                },
                columns: {
                    orderBy: { order : 'asc' },
                    include: {
                        tasks: {
                            orderBy: { order: 'asc' },
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
                        },
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found pr access denied' });
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mettre à jour un projet
export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user!.id;

        // Vérifier que l'utilisateur est OWNER ou ADMIN
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const project = await prisma.project.update({
            where: { id },
            data: {
                name,
                description,
            },
            include: {
                members: {
                    include: {
                        user: {
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
        });

        res.json(project);
    } catch (error) {
        console.error('Update project error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Supprimer un projet
export const deleteProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        // Seul le OWNER peut supprimer
        const member = await prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId,
                role : 'OWNER',
            },
        });

        if (!member) {
            return res.status(403).json({ error: 'Only project owner can delete the project' });
        }

        await prisma.project.delete({
            where: { id },
        });

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Internal server error'});
    }
};

// Ajouter un membre au projet
export const addMember = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { email, role = 'MEMBER' } = req.body;
        const userId = req.user!.id;

        // Vérifier les permissions
        const requester = await prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!requester) {
            return res.status(403).json({ error: 'Insufficient permissions'});
        }

        // Trouver l'utilisateur à ajouter
        const userToAdd = await prisma.user.findUnique({
            where: { email }
        });

        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Vérifier si déja membre
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: userToAdd.id,
                    projectId: id
                },
            },
        });

        if (existingMember) {
            return res.status(400).json({ error: 'User is already a member' });
        }

        // Ajouter le membre
        const newMember = await prisma.projectMember.create({
            data: {
                userId: userToAdd.id,
                projectId: id,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        res.status(201).json(newMember);
    } catch (error) {
        console.error('Add a member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Retirer un membre
export const removeMember = async (req: AuthRequest, res: Response) => {
    try {
        const { id, memberId } = req.params;
        const userId = req.user!.id;


        // Vérfier les permissions
        const requester = await prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId,
                role: {
                    in: ['OWNER', 'ADMIN'],
                },
            },
        });

        if (!requester) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Ne pas supprimer le OWNER
        const memberToRemove = await prisma.projectMember.findUnique({
            where: { id: memberId },
        });

        if (!memberToRemove) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (memberToRemove.role === 'OWNER') {
            return res.status(400).json({ error: 'Cannot remove project owner' });
        }

        await prisma.projectMember.delete({
            where: { id: memberId },
        });

        res.json({ message: 'Member removed successfully' });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Mettre à jour le rôle d'un membre
export const updatedMemberRole = async (req: AuthRequest, res: Response)  => {
    try {
        const { id, memberId } = req.params;
        const { role } = req.body;
        const userId = req.user!.id;

        // Seul le OWNER peut changer les rôles
        const requester = await prisma.projectMember.findFirst({
            where: {
                projectId: id,
                userId,
                role: 'OWNER',
            },
        });

        if (!requester) {
            return res.status(403).json({ error: 'Only owner can change member roles' });
        }

        const memberToUpdate = await prisma.projectMember.findUnique({
            where: { id: memberId }
        });

        if (!memberToUpdate) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Ne pas chager le role du OWNER
        if (memberToUpdate.role === 'OWNER') {
            return res.status(404).json({ error: 'Cannot change owner role' });
        }

        const updatedMember = await prisma.projectMember.update({
            where: { id: memberId },
            data: { role },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json(updatedMember);
    } catch (error) {
        onsole.error('Update member role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}