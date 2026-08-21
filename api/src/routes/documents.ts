import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  canReadDocumentType,
  canUploadDocumentType,
  canDeleteDocumentType,
  filterDocumentsByReadPermission,
  requireDocumentUpload,
  requireDocumentDelete
} from '../middleware/documentAccess';

const router = Router();
router.use(authenticate);

/**
 * GET /api/documents/project/:projectId
 * List documents for a project, filtered by user's read permissions.
 */
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const roleName = req.user.role.name;
    const docs = await prisma.documents.findMany({
      where: { project_id: req.params.projectId as string },
      orderBy: { uploaded_at: 'desc' }
    });

    const filtered = await filterDocumentsByReadPermission(roleName, docs);
    res.json(filtered);
  } catch (err: any) {
    console.error('List documents error:', err);
    res.status(500).json({ error: err.message || 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:id
 * Get a single document. Enforces read permission.
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: req.params.id as string }
    });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found', code: 'DOC_NOT_FOUND' });
    }

    const allowed = await canReadDocumentType(req.user.role.name, doc.document_type);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to view this document',
        code: 'DOC_READ_FORBIDDEN',
        document_type: doc.document_type,
        role: req.user.role.name
      });
    }

    res.json(doc);
  } catch (err: any) {
    console.error('Get document error:', err);
    res.status(500).json({ error: err.message || 'Failed to get document' });
  }
});

/**
 * POST /api/documents
 * Upload a new document. Enforces upload permission.
 * Body: { project_id, document_type, file_name, file_path, file_size?, mime_type?, notes? }
 */
router.post(
  '/',
  requireRole('founder', 'project_manager', 'cammy', 'dongmei', 'quality_reviewer'),
  async (req: AuthRequest, res) => {
    try {
      const { project_id, document_type, file_name, file_path, file_size, mime_type, notes } = req.body;

      if (!project_id || !document_type || !file_name || !file_path) {
        return res.status(400).json({
          error: 'project_id, document_type, file_name, and file_path are required',
          code: 'DOC_MISSING_FIELDS'
        });
      }

      // Enforce upload permission
      const allowed = await canUploadDocumentType(req.user.role.name, document_type);
      if (!allowed) {
        return res.status(403).json({
          error: 'Forbidden: you do not have permission to upload this document type',
          code: 'DOC_UPLOAD_FORBIDDEN',
          document_type,
          role: req.user.role.name
        });
      }

      const doc = await prisma.documents.create({
        data: {
          project_id,
          document_type,
          file_name,
          file_path,
          file_size: file_size ? BigInt(file_size) : null,
          mime_type,
          uploaded_by: req.user.id,
          notes
        }
      });

      res.status(201).json(doc);
    } catch (err: any) {
      console.error('Upload document error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload document' });
    }
  }
);

/**
 * PUT /api/documents/:id
 * Update document metadata (notes, file_name). Enforces upload permission on the document's type.
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: req.params.id as string }
    });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found', code: 'DOC_NOT_FOUND' });
    }

    const allowed = await canUploadDocumentType(req.user.role.name, doc.document_type);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to modify this document type',
        code: 'DOC_UPDATE_FORBIDDEN',
        document_type: doc.document_type,
        role: req.user.role.name
      });
    }

    const { file_name, notes } = req.body;
    const updated = await prisma.documents.update({
      where: { id: req.params.id as string },
      data: { file_name, notes }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Update document error:', err);
    res.status(500).json({ error: err.message || 'Failed to update document' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document. Enforces delete permission.
 */
router.delete('/:id', requireDocumentDelete(), async (req: AuthRequest, res) => {
  try {
    await prisma.documents.delete({
      where: { id: req.params.id as string }
    });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err: any) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
});

/**
 * GET /api/documents/permissions/my
 * List document types the current user can interact with.
 */
router.get('/permissions/my', async (req: AuthRequest, res) => {
  try {
    const perms = await prisma.document_type_permissions.findMany({
      where: { role: req.user.role.name }
    });
    res.json(perms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
