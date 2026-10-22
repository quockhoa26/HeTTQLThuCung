import client from 'prom-client';

// Initialize default recommended Prometheus metrics
client.collectDefaultMetrics({ prefix: 'pet_app_' });

// HTTP Request Counter
export const httpRequestCounter = new client.Counter({
  name: 'pet_http_requests_total',
  help: 'Tổng số lượt HTTP request đến backend',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new client.Histogram({
  name: 'pet_http_request_duration_seconds',
  help: 'Thời gian xử lý HTTP request (giây)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Business Gauges
export const totalPetsGauge = new client.Gauge({
  name: 'pet_total_pets',
  help: 'Tổng số lượng thú cưng trong hệ thống',
});

export const totalCustomersGauge = new client.Gauge({
  name: 'pet_total_customers',
  help: 'Tổng số lượng khách hàng trong hệ thống',
});

export const totalAppointmentsGauge = new client.Gauge({
  name: 'pet_total_appointments',
  help: 'Tổng số lịch hẹn theo trạng thái',
  labelNames: ['status'],
});

export const totalRevenueGauge = new client.Gauge({
  name: 'pet_total_revenue_vnd',
  help: 'Tổng doanh thu đã thanh toán (VND)',
});

export const dbQueryDuration = new client.Histogram({
  name: 'pet_db_query_duration_seconds',
  help: 'Thời gian thực thi câu lệnh SQL (giây)',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const register = client.register;
