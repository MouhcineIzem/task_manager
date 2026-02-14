import { Request, Response, NextFunction } from "express";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', err);

    // Erreur prisma
    if (err.name === 'PrismaClientKnowRequestError') {
        return res.status(400).json({
            error: 'Database error',
            details: err.message,
        });
    }

    // Erreur JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
        });
    }

    // Erreur génerique
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};

export const notFound = (req: Request, res: Response) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
    });
};