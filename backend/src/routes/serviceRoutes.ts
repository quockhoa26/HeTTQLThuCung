import { Router } from 'express';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  toggleServiceStatus,
  deleteService,
} from '../controllers/serviceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', authorizeRoles('ADMIN'), createService);
router.put('/:id', authorizeRoles('ADMIN'), updateService);
router.patch('/:id/toggle', authorizeRoles('ADMIN'), toggleServiceStatus);
router.delete('/:id', authorizeRoles('ADMIN'), deleteService);

export default router;
