import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { CONFIG } from './config';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import gateRoutes from './routes/gates';
import auditRoutes from './routes/audits';
import partnerRoutes from './routes/partners';
import documentRoutes from './routes/documents';
import dashboardRoutes from './routes/dashboard';
import bomRoutes from './routes/bom';
import etaRoutes from './routes/eta';

import pilotIssuesRoutes from './routes/pilot-issues';
import pilotExecutionRoutes from './routes/pilot-execution';
import pilotKpiRoutes from './routes/pilot-kpi';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/eta', etaRoutes);
app.use('/api/pilot-issues', pilotIssuesRoutes);
app.use('/api/pilot-execution', pilotExecutionRoutes);
app.use('/api/pilot-kpi', pilotKpiRoutes);

const PORT = CONFIG.PORT;
app.listen(PORT, () => {
  console.log(`EES API server running on port ${PORT}`);
});

export { prisma };
