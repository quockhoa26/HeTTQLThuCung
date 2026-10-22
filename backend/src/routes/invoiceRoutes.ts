import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  payInvoice,
} from '../controllers/invoiceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);

// Khách hàng hoặc Nhân viên/Admin xem hóa đơn (được kiểm soát phân quyền trong controller)
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

// Tạo hóa đơn và Xác nhận thanh toán CHỈ dành cho STAFF và ADMIN (Khách hàng không được tự xác nhận)
router.post('/', authorizeRoles('ADMIN', 'STAFF'), createInvoice);
router.patch('/:id/pay', authorizeRoles('ADMIN', 'STAFF'), payInvoice);

export default router;
