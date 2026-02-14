import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import columnRoutes from "./routes/column.routes";
import commentRoutes from "./routes/comment.routes";
import tagRoutes from "./routes/tag.routes";
import {errorHandler, notFound} from "./middleware/errorHandler";






const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
    res.json({ status : 'OK', message: 'Server is running' });
});


app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/tags', tagRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});