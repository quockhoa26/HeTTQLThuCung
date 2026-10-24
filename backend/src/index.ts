import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { register } from './utils/metrics.js';
import { metricsMiddleware } from './middlewares/metricsMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds, ensureCustomerSeed } from './db/seed.js';
import { query } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import petRoutes from './routes/petRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { updateBusinessMetrics } from './controllers/dashboardController.js';

const app = express();

// Basic security and parsing middlewares
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics tracking middleware
app.use(metricsMiddleware);

// Structured HTTP Request Logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/metrics' && req.path !== '/api/health') {
      logger.info('HTTP Request', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      });
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT 1 as alive');
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbCheck.rows[0].alive === 1 ? 'CONNECTED' : 'DISCONNECTED',
      environment: config.nodeEnv,
    });
  } catch (error) {
    logger.error('Health check database connection failed:', error);
    res.status(503).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: 'Cannot reach database',
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    await updateBusinessMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/orders', orderRoutes);

// 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn [${req.method} ${req.originalUrl}] không tồn tại trên hệ thống`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Server startup with DB auto-migration check
async function startServer() {
  try {
    logger.info('Đang kiểm tra kết nối cơ sở dữ liệu...');
    // Retry DB connection up to 10 times (useful when spinning up with docker-compose)
    let retries = 10;
    while (retries > 0) {
      try {
        await query('SELECT 1');
        logger.info('Kết nối cơ sở dữ liệu thành công!');
        break;
      } catch (err) {
        retries--;
        logger.warn(`Chờ cơ sở dữ liệu sẵn sàng... còn ${retries} lần thử`);
        await new Promise((res) => setTimeout(res, 2000));
        if (retries === 0) throw err;
      }
    }

    // Check if tables already exist, if not run migrations and seeds
    const checkTables = await query(`
      SELECT to_regclass('public.users') as table_exists
    `);
    if (!checkTables.rows[0].table_exists) {
      logger.info('Chưa có bảng dữ liệu, tiến hành chạy Migration và Seed...');
      await runMigrations();
      await runSeeds();
    } else {
      logger.info('Cơ sở dữ liệu đã tồn tại, kiểm tra và cập nhật migration tương thích...');
      await runMigrations();
      await ensureCustomerSeed();
    }

    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`Pet Management API Server đang lắng nghe tại cổng ${config.port}`);
    });

    const shutdown = async () => {
      logger.info('Đang tắt server an toàn (Graceful Shutdown)...');
      server.close(() => {
        logger.info('HTTP Server đã đóng.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Không thể khởi động server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
