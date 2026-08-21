-- Migration: Smart Gate Engine — Seed Gate Conditions & Permissions (Rev.1.2)
--
-- This migration seeds the default gate conditions for all 6 gates
-- and the required role permissions for gate evaluation and override.

-- Gate 01: Proposal GO / NO-GO (Stage 2)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 1, 'Proposal GO / NO-GO', '方案关卡', 2, 'Design proposal and measurement approved'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 1);

-- Gate 02: Commercial GO / NO-GO (Stage 4)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 2, 'Commercial GO / NO-GO', '商务关卡', 4, 'Deposit received, cost calculated, margin acceptable'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 2);

-- Gate 03: Procurement GO / NO-GO (Stage 5)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 3, 'Procurement GO / NO-GO', '采购关卡', 5, 'BOM approved, suppliers assigned'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 3);

-- Gate 04: Production / QC GO / NO-GO (Stage 6)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 4, 'Production / QC GO / NO-GO', '生产质检关卡', 6, 'QC audit passed with strict checklist'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 4);

-- Gate 05: Installation GO / NO-GO (Stage 8)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 5, 'Installation GO / NO-GO', '安装关卡', 8, 'Partner compliance valid and role-specific'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 5);

-- Gate 06: Handover GO / NO-GO (Stage 9)
INSERT INTO gates (id, gate_number, name_en, name_zh, trigger_stage, description)
SELECT gen_random_uuid(), 6, 'Handover GO / NO-GO', '移交关卡', 9, 'Lessons learned recorded, customer acceptance'
WHERE NOT EXISTS (SELECT 1 FROM gates WHERE gate_number = 6);

-- Seed Gate 01 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'document_uploaded', true, '{"document_type": "measurement_record"}'::jsonb, 1
FROM gates g WHERE g.gate_number = 1
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 1 AND gc.condition_type = 'document_uploaded');

-- Seed Gate 02 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'order_confirmed', true, null, 1
FROM gates g WHERE g.gate_number = 2
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 2 AND gc.condition_type = 'order_confirmed');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'customer_approved', true, null, 2
FROM gates g WHERE g.gate_number = 2
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 2 AND gc.condition_type = 'customer_approved');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'deposit_received', true, null, 3
FROM gates g WHERE g.gate_number = 2
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 2 AND gc.condition_type = 'deposit_received');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'cost_calculated', true, null, 4
FROM gates g WHERE g.gate_number = 2
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 2 AND gc.condition_type = 'cost_calculated');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'margin_above_target', true, null, 5
FROM gates g WHERE g.gate_number = 2
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 2 AND gc.condition_type = 'margin_above_target');

-- Seed Gate 03 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'bom_approved', true, null, 1
FROM gates g WHERE g.gate_number = 3
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 3 AND gc.condition_type = 'bom_approved');

-- Seed Gate 04 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'qc_passed', true, null, 1
FROM gates g WHERE g.gate_number = 4
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 4 AND gc.condition_type = 'qc_passed');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'document_uploaded', true, '{"document_type": "qc_report"}'::jsonb, 2
FROM gates g WHERE g.gate_number = 4
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 4 AND gc.condition_type = 'document_uploaded');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'no_damage_reported', true, null, 3
FROM gates g WHERE g.gate_number = 4
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 4 AND gc.condition_type = 'no_damage_reported');

-- Seed Gate 05 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'document_uploaded', true, '{"document_type": "installation_photos"}'::jsonb, 1
FROM gates g WHERE g.gate_number = 5
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 5 AND gc.condition_type = 'document_uploaded');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'compliance_valid', true, null, 2
FROM gates g WHERE g.gate_number = 5
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 5 AND gc.condition_type = 'compliance_valid');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'installation_time_recorded', true, null, 3
FROM gates g WHERE g.gate_number = 5
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 5 AND gc.condition_type = 'installation_time_recorded');

-- Seed Gate 06 Conditions
INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'document_uploaded', true, '{"document_type": "final_audit"}'::jsonb, 1
FROM gates g WHERE g.gate_number = 6
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 6 AND gc.condition_type = 'document_uploaded');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'customer_approved', true, null, 2
FROM gates g WHERE g.gate_number = 6
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 6 AND gc.condition_type = 'customer_approved');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'lessons_recorded', true, null, 3
FROM gates g WHERE g.gate_number = 6
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 6 AND gc.condition_type = 'lessons_recorded');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'cost_calculated', true, null, 4
FROM gates g WHERE g.gate_number = 6
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 6 AND gc.condition_type = 'cost_calculated');

INSERT INTO gate_conditions (id, gate_id, condition_type, required, config, sort_order)
SELECT gen_random_uuid(), g.id, 'warranty_issued', true, null, 5
FROM gates g WHERE g.gate_number = 6
AND NOT EXISTS (SELECT 1 FROM gate_conditions gc JOIN gates g2 ON gc.gate_id = g2.id WHERE g2.gate_number = 6 AND gc.condition_type = 'warranty_issued');

-- Seed role permissions for gate operations
INSERT INTO permissions (id, resource, action, description)
SELECT gen_random_uuid(), 'gate', 'evaluate', 'Execute gate evaluation'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'gate' AND action = 'evaluate');

INSERT INTO permissions (id, resource, action, description)
SELECT gen_random_uuid(), 'gate', 'override', 'Execute exceptional override'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE resource = 'gate' AND action = 'override');
