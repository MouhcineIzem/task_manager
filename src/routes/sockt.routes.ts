import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getOnlineUsers } from "../socket/socketHandler";


const router = Router();

router.use(authenticate);

router.get('/online-users', (req, res) => {
    const users = getOnlineUsers();
    res.json(users);
});

export default router;