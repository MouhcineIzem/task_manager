import { Router } from "express";
import {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember,
    updatedMemberRole,
} from "../controllers/project.controller";
import { authenticate } from "../middleware/auth";

const router = Router();


// Toutes les routes nécessitent l'authentification
router.use(authenticate);


// Routes des projects
router.post('/', createProject);
router.get('/', getMyProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Routes des membres
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.patch('/:id/members/:memberId/role', updatedMemberRole);


export default router;