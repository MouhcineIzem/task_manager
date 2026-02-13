import { Router } from 'express';
import {
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    moveTask,
    addTagTask,
    removeTagFromTask
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth";


const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/move', moveTask);
router.post('/:id/tags', addTagTask);
router.delete('/:id/tags/:tagId', removeTagFromTask);


export default router;