import express from 'express';
import cors from 'cors';
import http from 'http-status-codes';
// import routes from './app/routes/routes';
// import globalErrorHandler from './app/middlewares/globalErrorHandler';
// import hello from './app/routes/test';

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Global error handler
// app.use(globalErrorHandler);
// app.use(hello);

app.get('/', (req, res) => {
  res.send('SERVER RUNNING');
});

// app.use('/eto/api', routes);

// Wrong API error handler
app.use((req, res) => {
  res.status(http.NOT_FOUND).json({
    success: false,
    message: 'Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
});

export default app;
