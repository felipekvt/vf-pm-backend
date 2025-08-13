import { Router } from 'express';
import { prisma } from '../db';
import jwt from 'jsonwebtoken';
import { auth } from '../index';

const router = Router();

router.get('/', auth, async (req: any, res) => {
  const orgs = await prisma.membership.findMany({
    where: { userId: req.userId },
    include: { org: true },
  });
  // tipa o item do map
  res.json(orgs.map((m: any) => ({ id: m.orgId, name: m.org.name, role: m.role })));
});

router.post('/', auth, async (req: any, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name obrigatório' });
  const org = await prisma.organization.create({ data: { name } });
  await prisma.membership.create({ data: { userId: req.userId, orgId: org.id, role: 'ADMIN' } });
  res.status(201).json(org);
});

router.post('/select', auth, async (req: any, res) => {
  const { orgId } = req.body ?? {};
  if (!orgId) return res.status(400).json({ error: 'orgId obrigatório' });
  const m = await prisma.membership.findFirst({ where: { userId: req.userId, orgId } });
  if (!m) return res.status(403).json({ error: 'forbidden' });
  const token = (jwt as any).sign(
    { sub: req.userId, orgId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  res.json({ token });
});

export default router;
