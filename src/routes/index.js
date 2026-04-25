import { Router } from 'express';
import healthRouter from './health.routes.js';
import userRouter   from './user.routes.js';

const router = Router();

router.use('/health',   healthRouter);
router.use('/api/user', userRouter);

export default router;
