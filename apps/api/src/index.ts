import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import stationsRouter from './routes/stations';
import reviewsRouter from './routes/reviews';
import sessionsRouter from './routes/sessions';
import paymentsRouter from './routes/payments';
import usersRouter from './routes/users';
import vehiclesRouter from './routes/vehicles';
import adminRouter from './routes/admin';
import carImagesRouter from './routes/car-images';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PayMongo return page — user lands here after payment
app.get('/payment/return', (req, res) => {
  const status = req.query.status ?? 'complete';
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Payment ${status === 'failed' ? 'Failed' : 'Complete'}</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
                 align-items: center; justify-content: center; min-height: 100vh;
                 margin: 0; background: #f8f8f8; text-align: center; padding: 24px; }
          .icon { font-size: 64px; margin-bottom: 16px; }
          h1 { color: #1B4332; font-size: 24px; margin-bottom: 8px; }
          p { color: #888; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="icon">${status === 'failed' ? '❌' : '✅'}</div>
        <h1>${status === 'failed' ? 'Payment Failed' : 'Payment Complete!'}</h1>
        <p>You can now close this page and return to the app.</p>
      </body>
    </html>
  `);
});

app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/car-images', carImagesRouter);
app.use('/api/v1/stations', stationsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/vehicles', vehiclesRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
