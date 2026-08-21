-- Migration: Seed Document Type Permissions (DAC)
-- Rev.1.2 — Document Access Control Matrix
-- Run after document_type_permissions table exists.

-- Clear existing seeds to allow re-runs
DELETE FROM document_type_permissions WHERE role IN (
  'founder', 'cammy', 'dongmei', 'quality_reviewer',
  'project_manager', 'supplier', 'partner', 'installer'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FOUNDER / MANAGEMENT — Full Access
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'founder', true, true, true, 'all'),
('measurement_record',  'founder', true, true, true, 'all'),
('quotation',           'founder', true, true, true, 'all'),
('customer_approval',   'founder', true, true, true, 'all'),
('deposit_record',      'founder', true, true, true, 'all'),
('bom',                 'founder', true, true, true, 'all'),
('purchase_order',      'founder', true, true, true, 'all'),
('supplier_quotation',  'founder', true, true, true, 'all'),
('qc_report',           'founder', true, true, true, 'all'),
('packing_photos',      'founder', true, true, true, 'all'),
('shipping_documents',  'founder', true, true, true, 'all'),
('installation_photos', 'founder', true, true, true, 'all'),
('final_audit',         'founder', true, true, true, 'all'),
('customer_acceptance', 'founder', true, true, true, 'all'),
('warranty',            'founder', true, true, true, 'all');

-- ═══════════════════════════════════════════════════════════════════════════
-- CAMMY — Design & Customer Lead
-- Owns customer-facing and design documents
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'cammy', true, true, false, 'own_project'),
('measurement_record',  'cammy', true, true, false, 'own_project'),
('quotation',           'cammy', true, true, false, 'own_project'),
('customer_approval',   'cammy', true, true, false, 'own_project'),
('deposit_record',      'cammy', true, true, false, 'own_project'),
('bom',                 'cammy', true, false, false, 'own_project'),
('purchase_order',      'cammy', true, false, false, 'own_project'),
('supplier_quotation',  'cammy', true, false, false, 'own_project'),
('qc_report',           'cammy', true, false, false, 'own_project'),
('packing_photos',      'cammy', true, false, false, 'own_project'),
('shipping_documents',  'cammy', true, false, false, 'own_project'),
('installation_photos', 'cammy', true, false, false, 'own_project'),
('final_audit',         'cammy', true, false, false, 'own_project'),
('customer_acceptance', 'cammy', true, true, false, 'own_project'),
('warranty',            'cammy', true, true, false, 'own_project');

-- ═══════════════════════════════════════════════════════════════════════════
-- DONGMEI — China Supply Chain Director
-- Owns BOM, PO, supplier docs, QC, packing, shipping
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'dongmei', true, false, false, 'all'),
('measurement_record',  'dongmei', true, false, false, 'all'),
('quotation',           'dongmei', true, false, false, 'all'),
('customer_approval',   'dongmei', true, false, false, 'all'),
('deposit_record',      'dongmei', true, false, false, 'all'),
('bom',                 'dongmei', true, true, false, 'all'),
('purchase_order',      'dongmei', true, true, false, 'all'),
('supplier_quotation',  'dongmei', true, true, false, 'all'),
('qc_report',           'dongmei', true, true, false, 'all'),
('packing_photos',      'dongmei', true, true, false, 'all'),
('shipping_documents',  'dongmei', true, true, false, 'all'),
('installation_photos', 'dongmei', true, false, false, 'all'),
('final_audit',         'dongmei', true, false, false, 'all'),
('customer_acceptance', 'dongmei', true, false, false, 'all'),
('warranty',            'dongmei', true, false, false, 'all');

-- ═══════════════════════════════════════════════════════════════════════════
-- QUALITY REVIEWER — Independent QC
-- Owns QC reports and final audit; read-only on others
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'quality_reviewer', true, false, false, 'all'),
('measurement_record',  'quality_reviewer', true, false, false, 'all'),
('quotation',           'quality_reviewer', true, false, false, 'all'),
('customer_approval',   'quality_reviewer', true, false, false, 'all'),
('deposit_record',      'quality_reviewer', true, false, false, 'all'),
('bom',                 'quality_reviewer', true, false, false, 'all'),
('purchase_order',      'quality_reviewer', true, false, false, 'all'),
('supplier_quotation',  'quality_reviewer', true, false, false, 'all'),
('qc_report',           'quality_reviewer', true, true, false, 'all'),
('packing_photos',      'quality_reviewer', true, false, false, 'all'),
('shipping_documents',  'quality_reviewer', true, false, false, 'all'),
('installation_photos', 'quality_reviewer', true, false, false, 'all'),
('final_audit',         'quality_reviewer', true, true, false, 'all'),
('customer_acceptance', 'quality_reviewer', true, false, false, 'all'),
('warranty',            'quality_reviewer', true, false, false, 'all');

-- ═══════════════════════════════════════════════════════════════════════════
-- PROJECT MANAGER — Coordination
-- Can upload most docs; cannot delete
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'project_manager', true, true, false, 'all'),
('measurement_record',  'project_manager', true, true, false, 'all'),
('quotation',           'project_manager', true, true, false, 'all'),
('customer_approval',   'project_manager', true, true, false, 'all'),
('deposit_record',      'project_manager', true, false, false, 'all'),
('bom',                 'project_manager', true, true, false, 'all'),
('purchase_order',      'project_manager', true, true, false, 'all'),
('supplier_quotation',  'project_manager', true, true, false, 'all'),
('qc_report',           'project_manager', true, true, false, 'all'),
('packing_photos',      'project_manager', true, true, false, 'all'),
('shipping_documents',  'project_manager', true, true, false, 'all'),
('installation_photos', 'project_manager', true, true, false, 'all'),
('final_audit',         'project_manager', true, false, false, 'all'),
('customer_acceptance', 'project_manager', true, true, false, 'all'),
('warranty',            'project_manager', true, true, false, 'all');

-- ═══════════════════════════════════════════════════════════════════════════
-- SUPPLIER — Limited read-only access
-- NEVER sees customer selling price, margin, internal landed cost
-- Can only read docs directly related to their supply
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('bom',                 'supplier', true, false, false, 'assigned'),
('purchase_order',      'supplier', true, false, false, 'assigned'),
('supplier_quotation',  'supplier', true, true, false, 'assigned'),
('qc_report',           'supplier', true, false, false, 'assigned'),
('packing_photos',      'supplier', true, false, false, 'assigned'),
('shipping_documents',  'supplier', true, false, false, 'assigned');

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTNER — Specialist (electrician, plumber, gas, measurement)
-- Read installation-related docs for their assigned projects
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'partner', true, false, false, 'assigned'),
('measurement_record',  'partner', true, false, false, 'assigned'),
('installation_photos', 'partner', true, true, false, 'assigned'),
('customer_acceptance', 'partner', true, false, false, 'assigned'),
('warranty',            'partner', true, false, false, 'assigned');

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTALLER — Installation execution
-- Can upload installation photos; read design and measurement
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO document_type_permissions (document_type, role, can_read, can_upload, can_delete, scope) VALUES
('design_drawing',      'installer', true, false, false, 'assigned'),
('measurement_record',  'installer', true, false, false, 'assigned'),
('installation_photos', 'installer', true, true, false, 'assigned'),
('customer_acceptance', 'installer', true, false, false, 'assigned');
