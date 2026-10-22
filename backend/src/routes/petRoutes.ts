import { Router } from 'express';
import {
  getPublicPets,
  getPublicPetById,
  getMyPets,
  getPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
} from '../controllers/petController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

// 1. Tuyến đường công khai (Không yêu cầu xác thực - Khách chưa đăng nhập truy cập được)
router.get('/public', getPublicPets);
router.get('/public/:id', getPublicPetById);

// 2. Tuyến đường dành cho Khách hàng đã đăng nhập (CUSTOMER)
router.get('/my-pets', authenticate, getMyPets);

// 3. Tuyến đường quản lý nội bộ (Yêu cầu vai trò ADMIN hoặc STAFF)
router.get('/', authenticate, authorizeRoles('ADMIN', 'STAFF'), getPets);
router.get('/:id', authenticate, authorizeRoles('ADMIN', 'STAFF'), getPetById);
router.post('/', authenticate, authorizeRoles('ADMIN', 'STAFF'), createPet);
router.put('/:id', authenticate, authorizeRoles('ADMIN', 'STAFF'), updatePet);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deletePet);

export default router;
