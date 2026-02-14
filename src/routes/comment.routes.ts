import { Router } from 'express';
import {
    createComment,
    getTaskComments,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller";
import { authenticate } from "../middleware/auth";


const router = Router();

router.use(authenticate);

router.post('/', createComment);
router.get('/task/:taskId', getTaskComments);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);


export default router;