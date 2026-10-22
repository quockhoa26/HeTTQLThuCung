import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', authorizeRoles('ADMIN'), getAuditLogs);

export default router;
