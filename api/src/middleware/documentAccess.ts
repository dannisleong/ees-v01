/**
 * Document Access Control (DAC) Middleware
 *
 * Rev.1.2 Rules:
 * 1. Every document operation checks role-based permissions per document_type
 * 2. Read, Upload, Delete are controlled separately
 * 3. Unauthorized access returns 403 with specific error code
 * 4. Permissions are defined in document_type_permissions table
 * 5. No document can be accessed without explicit permission grant
 */

import { Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AuthRequest } from './auth';

export interface DocumentPermission {
  can_read: boolean;
  can_upload: boolean;
  can_delete: boolean;
  scope: string;
}

/**
 * Fetch permissions for a role + document_type combination.
 */
export async function getDocumentPermission(
  role: string,
  documentType: string
): Promise<DocumentPermission | null> {
  const perm = await prisma.document_type_permissions.findFirst({
    where: { role, document_type: documentType }
  });
  if (!perm) return null;
  return {
    can_read: perm.can_read,
    can_upload: perm.can_upload,
    can_delete: perm.can_delete,
    scope: perm.scope
  };
}

/**
 * Check if a role can read a document type.
 */
export async function canReadDocumentType(role: string, documentType: string): Promise<boolean> {
  const perm = await getDocumentPermission(role, documentType);
  return perm?.can_read === true;
}

/**
 * Check if a role can upload a document type.
 */
export async function canUploadDocumentType(role: string, documentType: string): Promise<boolean> {
  const perm = await getDocumentPermission(role, documentType);
  return perm?.can_upload === true;
}

/**
 * Check if a role can delete a document type.
 */
export async function canDeleteDocumentType(role: string, documentType: string): Promise<boolean> {
  const perm = await getDocumentPermission(role, documentType);
  return perm?.can_delete === true;
}

/**
 * Middleware: verify READ permission for a document type.
 * Used on routes where document_type is in req.body or query.
 */
export function requireDocumentRead(documentTypeField: string = 'document_type') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const documentType = req.body[documentTypeField] || req.query[documentTypeField];
    if (!documentType) {
      return res.status(400).json({ error: 'document_type is required', code: 'DOC_TYPE_MISSING' });
    }
    const allowed = await canReadDocumentType(req.user.role.name, documentType as string);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to read this document type',
        code: 'DOC_READ_FORBIDDEN',
        document_type: documentType,
        role: req.user.role.name
      });
    }
    next();
  };
}

/**
 * Middleware: verify UPLOAD permission for a document type.
 */
export function requireDocumentUpload(documentTypeField: string = 'document_type') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const documentType = req.body[documentTypeField];
    if (!documentType) {
      return res.status(400).json({ error: 'document_type is required', code: 'DOC_TYPE_MISSING' });
    }
    const allowed = await canUploadDocumentType(req.user.role.name, documentType as string);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to upload this document type',
        code: 'DOC_UPLOAD_FORBIDDEN',
        document_type: documentType,
        role: req.user.role.name
      });
    }
    next();
  };
}

/**
 * Middleware: verify DELETE permission for an existing document.
 * Looks up the document first to determine its type.
 */
export function requireDocumentDelete() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required', code: 'DOC_ID_MISSING' });
    }

    const doc = await prisma.documents.findUnique({
      where: { id: docId as string },
      select: { document_type: true, project_id: true }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found', code: 'DOC_NOT_FOUND' });
    }

    const allowed = await canDeleteDocumentType(req.user.role.name, doc.document_type);
    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to delete this document type',
        code: 'DOC_DELETE_FORBIDDEN',
        document_type: doc.document_type,
        role: req.user.role.name
      });
    }

    // Attach doc to request for downstream use
    (req as any).document = doc;
    next();
  };
}

/**
 * Filter a list of documents by read permission for the requesting user.
 */
export async function filterDocumentsByReadPermission(
  userRole: string,
  documents: Array<{ document_type: string; [key: string]: any }>
): Promise<Array<any>> {
  const results = [];
  for (const doc of documents) {
    const allowed = await canReadDocumentType(userRole, doc.document_type);
    if (allowed) results.push(doc);
  }
  return results;
}
