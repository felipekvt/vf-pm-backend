// routes/assets.ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma'; // seu cliente Prisma
import { authMiddleware } from '../auth'; // extrai userId/orgId do token

const router = Router();

const createAssetSchema = z.object({
  name: z.string().trim().min(3).max(60),
  location: z.string().trim().max(80).nullable().optional(),
});

router.get('/api/assets', authMiddleware, async (req: any, res) => {
  const orgId = req.orgId;
  const assets = await prisma.asset.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(assets);
});

router.get('/api/assets/:id', authMiddleware, async (req: any, res) => {
  const orgId = req.orgId;
  const { id } = req.params;
  const asset = await prisma.asset.findFirst({ where: { id, orgId } });
  if (!asset) return res.status(404).json({ message: 'Não encontrado' });
  res.json(asset);
});

router.post('/api/assets', authMiddleware, async (req: any, res) => {
  const orgId = req.orgId;
  const parse = createAssetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: 'Dados inválidos' });

  const { name, location } = parse.data;

  // unicidade por org
  const exists = await prisma.asset.findFirst({
    where: { orgId, name: name.trim() },
    select: { id: true },
  });
  if (exists) return res.status(409).json({ message: 'Já existe um ativo com esse nome.' });

  const created = await prisma.asset.create({
    data: { orgId, name: name.trim(), location: location ?? null },
    select: { id: true, name: true, location: true, createdAt: true },
  });

  res.status(201).json(created); // front usa created.id para redirecionar
});

export default router;
