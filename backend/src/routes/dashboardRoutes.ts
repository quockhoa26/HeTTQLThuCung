import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/stats', authorizeRoles('ADMIN', 'STAFF'), getDashboardStats);

export default router;
