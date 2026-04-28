import { Router } from 'express';
import healthRouter       from './health.routes.js';
import userRouter         from './user.routes.js';
import clientRouter       from './client.routes.js';
import projectRouter      from './project.routes.js';
import deliverynoteRouter from './deliverynote.routes.js';

const router = Router();

router.use('/health',            healthRouter);
router.use('/api/user',          userRouter);
router.use('/api/client',        clientRouter);
router.use('/api/project',       projectRouter);
router.use('/api/deliverynote',  deliverynoteRouter);

export default router;
