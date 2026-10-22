const API_BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('pet_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Lỗi yêu cầu: ${response.statusText} (${response.status})`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (data: {
    fullName: string;
    phone: string;
    email: string;
    username: string;
    password: string;
    address?: string;
  }) =>
    request<{ success: boolean; message: string; data: { user: any } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request<{ success: boolean; data: any }>('/auth/me'),
  updateProfile: (data: { fullName: string; email: string; phone?: string; address?: string }) =>
    request<{ success: boolean; message: string; data: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => request<{ success: boolean; data: any }>('/dashboard/stats'),

  // Customers
  getCustomers: (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; data: any[]; pagination: any }>(`/customers?${query.toString()}`);
  },
  getCustomerById: (id: number) => request<{ success: boolean; data: any }>(`/customers/${id}`),
  createCustomer: (data: any) =>
    request<{ success: boolean; message: string; data: any }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: number, data: any) =>
    request<{ success: boolean; message: string; data: any }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: number) =>
    request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),

  // Pets
  getPublicPets: (params?: {
    search?: string;
    species?: string;
    breed?: string;
    gender?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.species) query.append('species', params.species);
    if (params?.breed) query.append('breed', params.breed);
    if (params?.gender) query.append('gender', params.gender);
    if (params?.status) query.append('status', params.status);
    if (params?.minPrice !== undefined) query.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) query.append('maxPrice', params.maxPrice.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; data: any[]; pagination: any }>(`/pets/public?${query.toString()}`);
  },
  getPublicPetById: (id: number) => request<{ success: boolean; data: any }>(`/pets/public/${id}`),
  getMyPets: () => request<{ success: boolean; data: any[] }>('/pets/my-pets'),

  getPets: (params?: { search?: string; species?: string; customerId?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.species) query.append('species', params.species);
    if (params?.customerId) query.append('customerId', params.customerId.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; data: any[]; pagination: any }>(`/pets?${query.toString()}`);
  },
  getPetById: (id: number) => request<{ success: boolean; data: any }>(`/pets/${id}`),
  createPet: (data: any) =>
    request<{ success: boolean; message: string; data: any }>('/pets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePet: (id: number, data: any) =>
    request<{ success: boolean; message: string; data: any }>(`/pets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePet: (id: number) =>
    request<{ success: boolean; message: string }>(`/pets/${id}`, {
      method: 'DELETE',
    }),

  // Services
  getServices: (activeOnly = false) =>
    request<{ success: boolean; data: any[] }>(`/services${activeOnly ? '?activeOnly=true' : ''}`),
  createService: (data: any) =>
    request<{ success: boolean; message: string; data: any }>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateService: (id: number, data: any) =>
    request<{ success: boolean; message: string; data: any }>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleServiceStatus: (id: number) =>
    request<{ success: boolean; message: string; data: any }>(`/services/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteService: (id: number) =>
    request<{ success: boolean; message: string }>(`/services/${id}`, {
      method: 'DELETE',
    }),

  // Appointments
  getAppointments: (params?: { date?: string; status?: string; staffId?: number; petId?: number; customerId?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.status) query.append('status', params.status);
    if (params?.staffId) query.append('staffId', params.staffId.toString());
    if (params?.petId) query.append('petId', params.petId.toString());
    if (params?.customerId) query.append('customerId', params.customerId.toString());
    if (params?.search) query.append('search', params.search);
    return request<{ success: boolean; data: any[] }>(`/appointments?${query.toString()}`);
  },
  getAppointmentById: (id: number) => request<{ success: boolean; data: any }>(`/appointments/${id}`),
  createAppointment: (data: any) =>
    request<{ success: boolean; message: string; data: any }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAppointment: (id: number, data: any) =>
    request<{ success: boolean; message: string; data: any }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateAppointmentStatus: (id: number, status: string) =>
    request<{ success: boolean; message: string; data: any }>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Invoices
  getInvoices: (params?: { status?: string; customerId?: number; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; data: any[]; pagination: any }>(`/invoices?${query.toString()}`);
  },
  getInvoiceById: (id: number) => request<{ success: boolean; data: any }>(`/invoices/${id}`),
  createInvoice: (data: any) =>
    request<{ success: boolean; message: string; data: any }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  payInvoice: (id: number, paymentMethod: string) =>
    request<{ success: boolean; message: string; data: any }>(`/invoices/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethod }),
    }),

  // Users & Staff
  getUsers: (role?: string) =>
    request<{ success: boolean; data: any[] }>(`/users${role ? `?role=${role}` : ''}`),

  // Audit Logs
  getAuditLogs: (page = 1, limit = 20) =>
    request<{ success: boolean; data: any[]; pagination: any }>(`/audit-logs?page=${page}&limit=${limit}`),

  // Pet Orders (Mua thú cưng trực tuyến)
  getPetOrders: (params?: { status?: string; paymentStatus?: string; customerId?: number; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.customerId) query.append('customerId', params.customerId.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; data: any[]; pagination: any }>(`/orders?${query.toString()}`);
  },
  getPetOrderById: (id: number) => request<{ success: boolean; data: any }>(`/orders/${id}`),
  createPetOrder: (data: {
    petId: number;
    paymentMethod?: string;
    customerName?: string;
    customerPhone?: string;
    shippingName?: string;
    shippingPhone?: string;
    shippingAddress?: string;
    notes?: string;
    customerId?: number;
  }) =>
    request<{ success: boolean; message: string; data: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderStatus: (id: number, orderStatus: string, notes?: string) =>
    request<{ success: boolean; message: string; data: any }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus, notes }),
    }),
  payPetOrder: (id: number, paymentMethod?: string) =>
    request<{ success: boolean; message: string; data: any }>(`/orders/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethod: paymentMethod || 'TIEN_MAT' }),
    }),
};
