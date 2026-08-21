import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const partners = await prisma.partners.findMany({
    include: { qualifications: { include: { qualification_type: true } } }
  });
  res.json(partners);
});

router.post('/qualification', async (req: AuthRequest, res) => {
  const { partner_id, qualification_type_id, licence_number, issuing_authority, issue_date, expiry_date } = req.body;

  const partner = await prisma.partners.findUnique({ where: { id: partner_id } });
  const qType = await prisma.qualification_types.findUnique({ where: { id: qualification_type_id } });

  if (!partner || !qType) {
    return res.status(400).json({ error: 'Partner or qualification type not found' });
  }

  const applicable = qType.applicable_partner_types as string[];
  if (!applicable.includes(partner.type)) {
    return res.status(400).json({
      error: 'Qualification type mismatch',
      message: `Partner type '${partner.type}' does not match qualification requirements`,
      required: applicable
    });
  }

  const qual = await prisma.qualifications.create({
    data: {
      partner_id,
      qualification_type_id,
      licence_number,
      issuing_authority,
      issue_date: issue_date ? new Date(issue_date) : null,
      expiry_date: new Date(expiry_date)
    }
  });

  res.json(qual);
});

export default router;
