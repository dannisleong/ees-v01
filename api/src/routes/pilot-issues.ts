import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// List pilot issues for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const issues = await prisma.pilot_issues.findMany({
      where: { project_id: projectId },
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { created_at: 'desc' },
      ],
    });
    res.json(issues);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to load pilot issues' });
  }
});

// Create pilot issue
router.post('/', authenticate, async (req, res) => {
  try {
    const issue = await prisma.pilot_issues.create({
      data: {
        project_id: req.body.project_id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority || 'medium',
        owner_id: req.body.owner_id,
        action: req.body.action,
        status: 'open',
        created_by: (req as any).user?.id,
      },
    });
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create pilot issue' });
  }
});

// Update pilot issue
router.put('/:id', authenticate, async (req, res) => {
  try {
    const issue = await prisma.pilot_issues.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        owner_id: req.body.owner_id,
        action: req.body.action,
        status: req.body.status,
        resolution: req.body.resolution,
        updated_at: new Date(),
      },
    });
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update pilot issue' });
  }
});

// Delete pilot issue
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.pilot_issues.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to delete pilot issue' });
  }
});

export default router;
