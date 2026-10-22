export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  customerId?: number | null;
  phone?: string;
  address?: string;
}

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  pet_count?: number;
  pets?: Pet[];
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: number;
  pet_code: string;
  name: string;
  species: string;
  breed?: string;
  gender: 'Đực' | 'Cái';
  birth_date?: string;
  weight?: number;
  fur_color?: string;
  health_status?: string;
  image_url?: string;
  notes?: string;
  is_public?: boolean;
  price?: number;
  status?: 'SAN_SANG' | 'DA_DAT' | 'DA_CO_CHU';
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  appointments?: Appointment[];
  created_at: string;
  updated_at: string;
}

export interface PublicPet {
  id: number;
  pet_code: string;
  name: string;
  species: string;
  breed?: string;
  gender: 'Đực' | 'Cái';
  birth_date?: string;
  weight?: number;
  fur_color?: string;
  health_status?: string;
  image_url?: string;
  notes?: string;
  is_public: boolean;
  price: number;
  status: 'SAN_SANG' | 'DA_DAT' | 'DA_CO_CHU';
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'CHO_XAC_NHAN'
  | 'DA_XAC_NHAN'
  | 'DANG_THUC_HIEN'
  | 'HOAN_THANH'
  | 'DA_HUY';

export interface Appointment {
  id: number;
  appointment_code: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pet_id: number;
  pet_name?: string;
  pet_species?: string;
  pet_breed?: string;
  staff_id?: number;
  staff_name?: string;
  appointment_date: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  services?: Array<{ id: number; name: string; price: number; duration: number }>;
  total_price?: number;
  created_at: string;
}

export interface InvoiceItem {
  id?: number;
  serviceId?: number | null;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Invoice {
  id: number;
  invoice_code: string;
  appointment_id?: number;
  appointment_code?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_email?: string;
  pet_id: number;
  pet_name?: string;
  pet_species?: string;
  total_amount: number;
  status: 'CHUA_THANH_TOAN' | 'DA_THANH_TOAN';
  payment_method: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'MA_QR' | 'QR_DEMO';
  paid_at?: string;
  notes?: string;
  items?: InvoiceItem[];
  created_at: string;
}

export interface DashboardStats {
  totalPets: number;
  totalCustomers: number;
  appointmentsToday: number;
  appointmentsPending: number;
  totalRevenue: number;
  revenueByPeriod: Array<{ date_label: string; revenue: number }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  upcomingAppointments: Appointment[];
  speciesDistribution: Array<{ species: string; count: number }>;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username?: string;
  user_full_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface PetOrder {
  id: number;
  order_code: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_name?: string;
  shipping_phone?: string;
  pet_id: number;
  pet_code?: string;
  pet_name: string;
  pet_species: string;
  pet_breed?: string;
  pet_image_url?: string;
  unit_price: number;
  total_amount: number;
  payment_method: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'QR_DEMO' | 'MA_QR';
  payment_status: 'CHUA_THANH_TOAN' | 'DA_THANH_TOAN';
  order_status: 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DANG_GIAO' | 'HOAN_THANH' | 'DA_HUY';
  shipping_address?: string;
  notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
