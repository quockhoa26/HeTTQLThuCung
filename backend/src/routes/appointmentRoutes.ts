import { Router } from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

router.use(authenticate);

// Khách hàng hoặc Nhân viên/Admin xem và tạo lịch hẹn (được kiểm soát phân quyền trong controller)
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);

// Sửa lịch hẹn và đổi trạng thái (chờ xác nhận, hoàn thành, hủy...) CHỈ dành cho STAFF và ADMIN
router.put('/:id', authorizeRoles('ADMIN', 'STAFF'), updateAppointment);
router.patch('/:id/status', authorizeRoles('ADMIN', 'STAFF'), updateAppointmentStatus);

export default router;
