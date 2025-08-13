import { Router } from 'express';
import { prisma } from '../db';
import { auth } from '../index';

const r = Router();

r.get('/', auth, async (req: any, res) => {
  const list = await prisma.workOrder.findMany({
    where: { orgId: req.orgId },
    include: { asset: true, tasks: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

r.post('/', auth, async (req: any, res) => {
  const { assetId, title, description, tasks } = req.body ?? {};
  if (!assetId || !title)
    return res.status(400).json({ error: 'assetId e title são obrigatórios' });

  const anyUser = await prisma.membership.findFirst({ where: { orgId: req.orgId } });

  const wo = await prisma.workOrder.create({
    data: {
      orgId: req.orgId,
      assetId,
      title,
      description,
      createdById: anyUser!.userId,
      // tipa o map de tasks
      tasks:
        Array.isArray(tasks) && tasks.length
          ? { create: (tasks as string[]).map((t: string) => ({ text: t })) }
          : undefined,
    },
    include: { tasks: true },
  });

  res.status(201).json(wo);
});

r.post('/:id/complete-task', auth, async (req: any, res) => {
  const { id } = req.params;
  const { taskId } = req.body ?? {};
  if (taskId) {
    await prisma.checklistItem.update({ where: { id: taskId }, data: { done: true } });
  }
  const wo = await prisma.workOrder.findUnique({ where: { id }, include: { tasks: true } });
  const allDone = wo?.tasks.length && wo.tasks.every((t: any) => t.done);
  if (allDone) await prisma.workOrder.update({ where: { id }, data: { status: 'DONE' } });
  res.json({ ok: true });
});

export default r;
