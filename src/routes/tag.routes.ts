import { Router } from 'express';
import {
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag,
    searchTags,
} from "../controllers/tag.controller";
import { authenticate } from "../middleware/auth";


const router = Router();

router.use(authenticate);


router.post('/', createTag);
router.get('/', getAllTags);
router.get('/search', searchTags);
router.get('/:id', getTagById);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);


export default router;