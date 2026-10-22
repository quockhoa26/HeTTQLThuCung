import { Router } from 'express';
import { getUsers } from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', authorizeRoles('ADMIN', 'STAFF'), getUsers);

export default router;
