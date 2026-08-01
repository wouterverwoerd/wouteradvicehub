import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import usersRouter from './src/server/routes/users.js';
import advicesRouter from './src/server/routes/advices.js';
import eventsRouter from './src/server/routes/events.js';
import ideasRouter from './src/server/routes/ideas.js';
import jobsRouter from './src/server/routes/jobs.js';
import { isMySqlConnected } from './src/server/db/sequelize.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 4000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'wouteradvicenode-app',
      database: isMySqlConnected ? 'MySQL (Sequelize)' : 'In-Memory (Fallback)',
      time: new Date().toISOString(),
    });
  });

  app.get('/api/db-status', (req, res) => {
    const dbHost = process.env.REACT_APP_API_HOST || process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
    const dbPort = process.env.REACT_APP_API_PORT || process.env.DB_PORT || '3306';
    const dbUser = process.env.REACT_APP_API_USER || process.env.DB_USER || 'root';
    const dbName = process.env.REACT_APP_API_DATABASE || process.env.DB_NAME || 'wouteradvicenode';
    const dbDialect = process.env.REACT_APP_API_SEQUALIZE || process.env.DB_DIALECT || 'mysql';

    res.json({
      connected: isMySqlConnected,
      engine: 'MySQL',
      orm: 'Sequelize',
      config: {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        database: dbName,
        dialect: dbDialect,
      },
    });
  });

  app.use('/users', usersRouter);
  app.use('/advices', advicesRouter);
  app.use('/events', eventsRouter);
  app.use('/ideas', ideasRouter);
  app.use('/jobs', jobsRouter);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    if (typeof err === 'string') {
      return res.status(400).json({ message: err });
    }
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  });

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wouter Advice API & App running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
