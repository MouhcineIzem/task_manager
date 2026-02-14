import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from "bcryptjs";
import dotenv from "dotenv";


dotenv.config();

const prisma = new PrismaClient();


async function main() {
    console.log('Starting seed...');

    // Créer des utilisateurs
    const user1 = await prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            name: 'Alice Johnson',
            password: await bcrypt.hash('password123', 10),
        },
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            name: 'Bob Smith',
            password: await bcrypt.hash('password123', 10),
        },
    });

    console.log('Users created');


    // Créer des tags
    const bugTag = await prisma.tag.upsert({
        where: { name: 'Bug' },
        update: {},
        create: { name: 'Bug', color: '#ef4444' },
    });

    const featureTag = await prisma.tag.upsert({
        where: { name: 'Feature' },
        update: {},
        create: { name: 'Feature', color: '#3b82f6' },
    });

    const urgentTag = await prisma.tag.upsert({
        where: { name: 'Urgent' },
        update: {},
        create: { name: 'Urgent', color: '#f59e0b' },
    });

    console.log('Tags created');

    // Créer un projet
    const project = await prisma.project.create({
        data: {
            name: 'Application Web E-commerce',
            description: 'Développement du site e-commerce',
            members: {
                create: [
                    { userId: user1.id, role: 'OWNER' },
                    { userId: user2.id, role: 'MEMBER' },
                ],
            },
            columns: {
                create: [
                    { name: 'Backlog', order: 0 },
                    { name: 'To Do', order: 1 },
                    { name: 'In Progress', order: 2 },
                    { name: 'Review', order: 3 },
                    { name: 'Done', order: 4 },
                ],
            },
        },
        include: {
            columns: true,
        },
    });

    console.log('Project created');

    // Créer des taches
    const backlogColumn = project.columns.find((c) => c.name === 'Backlog')!;
    const todoColumn = project.columns.find((c) => c.name === 'To Do')!;
    const inProgressColumn = project.columns.find((c) => c.name === 'In Progress')!;

    await prisma.task.create({
        data: {
            title: 'Configurer la base de données',
            description: 'Mettre en place PostgreSQL et Prisma',
            columnId: inProgressColumn.id,
            assigneeId: user1.id,
            priority: 'HIGH',
            order: 0,
            tags: {
                create: [{ tagId: featureTag.id }],
            },
        },
    });

    await prisma.task.create({
        data: {
            title: 'Créer le système d\'authentification',
            description: 'JWT + refresh tokens',
            columnId: todoColumn.id,
            assigneeId: user1.id,
            priority: 'URGENT',
            order: 0,
            tags: {
                create: [{ tagId: featureTag.id }, { tagId: urgentTag.id }],
            },
        },
    });

    await prisma.task.create({
        data: {
            title: 'Corriger le bug du panier',
            description: 'Le total ne se calcule pas correctement',
            columnId: todoColumn.id,
            assigneeId: user2.id,
            priority: 'HIGH',
            order: 1,
            tags: {
                create: [{ tagId: bugTag.id }, { tagId: urgentTag.id }],
            },
        },
    });

    await prisma.task.create({
        data: {
            title: 'Optimiser les images',
            description: 'Compresser les images produits',
            columnId: backlogColumn.id,
            priority: 'LOW',
            order: 0,
            tags: {
                create: [{ tagId: featureTag.id }],
            },
        },
    });

    console.log('Tasks created');
    console.log('Seed completed!');
}

main()
.catch((e) => {
    console.error(e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});