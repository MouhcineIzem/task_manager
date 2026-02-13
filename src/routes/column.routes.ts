import { Router } from "express";
import {
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
} from "../controllers/column.controller";
import { authenticate } from "../middleware/auth";


const router = Router();

router.use(authenticate);


router.post('/', createColumn);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);
router.patch('/project/:projectId/reorder', reorderColumns)


export default router;