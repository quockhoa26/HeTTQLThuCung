import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);

// Danh sách khách hàng và tạo mới chỉ dành cho ADMIN và STAFF
router.get('/', authorizeRoles('ADMIN', 'STAFF'), getCustomers);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), createCustomer);
router.delete('/:id', authorizeRoles('ADMIN'), deleteCustomer);

// Xem và sửa chi tiết: Được kiểm soát quyền sở hữu bên trong Controller (CUSTOMER chỉ xem/sửa chính mình)
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);

export default router;
