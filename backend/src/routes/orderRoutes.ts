import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  payOrder,
} from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

// Tất cả các thao tác đơn hàng đều yêu cầu đăng nhập
router.use(authenticate);

// 1. Tạo đơn mua thú cưng (CUSTOMER mua trực tiếp hoặc STAFF/ADMIN tạo hộ)
router.post('/', createOrder);

// 2. Lấy danh sách đơn hàng (CUSTOMER chỉ xem đơn của mình; STAFF/ADMIN xem tất cả)
router.get('/', getOrders);

// 3. Xem chi tiết đơn hàng (Phân quyền kiểm tra trong controller)
router.get('/:id', getOrderById);

// 4. Cập nhật trạng thái đơn hàng (Chỉ STAFF và ADMIN)
router.patch('/:id/status', authorizeRoles('ADMIN', 'STAFF'), updateOrderStatus);

// 5. Xác nhận thanh toán đơn hàng (Chỉ STAFF và ADMIN)
router.patch('/:id/pay', authorizeRoles('ADMIN', 'STAFF'), payOrder);

export default router;
