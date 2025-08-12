import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

import authRoutes from './routes/auth';
import orgRoutes from './routes/orgs';
import assetRoutes from './routes/assets';
import readingRoutes from './routes/readings';
import woRoutes from './routes/workorders';
import pmRoutes from './routes/pm';

dotenv.config();
const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(morgan('tiny'));

app.get('/healthz', (_, res) => res.status(200).send('ok'));

app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/workorders', woRoutes);
app.use('/api/pm', pmRoutes);

export function auth(req: any, res: any, next: any) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    req.userId = payload.sub;
    req.orgId = payload.orgId;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

app.get('/api/me', auth, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json({ id: user.id, name: user.name, email: user.email, orgId: req.orgId });
});

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VF PM backend on :${PORT}`));
