import os

schema = '''generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model users {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  email         String   @unique
  password_hash String
  name_zh       String?
  name_en       String?
  phone         String?
  role_id       String
  is_active     Boolean  @default(true)
  last_login_at DateTime? @db.Timestamp(6)
  created_at    DateTime @default(now()) @db.Timestamp(6)
  updated_at    DateTime @default(now()) @db.Timestamp(6)
  created_by    String?
  updated_by    String?

  role roles @relation(fields: [role_id], references: [id])

  projects_cammy   projects[] @relation("cammy")
  projects_dongmei projects[] @relation("dongmei")
  projects_pm      projects[] @relation("pm")
  audit_logs       audit_logs[] @relation("audit_logs_created_by")
  issues_owned     issues[] @relation("issues_owner")
}

model roles {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  name        String   @unique
  name_zh     String?
  name_en     String?
  description String?
  level       Int      @default(0)
  created_at  DateTime @default(now()) @db.Timestamp(6)

  users            users[]
  role_permissions role_permissions[]
}

model permissions {
  id          String @id @default(dbgenerated("gen_random_uuid()"))
  resource    String
  action      String
  description String?

  role_permissions role_permissions[]
}

model role_permissions {
  role_id       String
  permission_id String

  role       roles       @relation(fields: [role_id], references: [id])
  permission permissions @relation(fields: [permission_id], references: [id])

  @@id([role_id, permission_id])
}

model projects {
  id                      String   @id @default(dbgenerated("gen_random_uuid()"))
  project_code            String   @unique
  name_zh                 String?
  name_en                 String?
  customer_id             String?
  current_stage           Int      @default(1)
  current_gate            Int      @default(1)
  status                  String   @default("active")
  cammy_id                String?
  dongmei_id              String?
  pm_id                   String?
  target_margin_percent   Decimal? @db.Decimal(5, 2)
  selling_price           Decimal? @db.Decimal(15, 2)
  total_landed_cost       Decimal? @db.Decimal(15, 2)
  actual_saving           Decimal? @db.Decimal(15, 2)
  estimated_sg_market_price Decimal? @db.Decimal(15, 2)
  started_at              DateTime? @db.Date
  completed_at            DateTime? @db.Date
  created_at              DateTime @default(now()) @db.Timestamp(6)
  updated_at              DateTime @default(now()) @db.Timestamp(6)
  created_by              String?
  updated_by              String?

  customer             customers? @relation(fields: [customer_id], references: [id])
  cammy                users?     @relation("cammy", fields: [cammy_id], references: [id])
  dongmei              users?     @relation("dongmei", fields: [dongmei_id], references: [id])
  pm                   users?     @relation("pm", fields: [pm_id], references: [id])
  project_stages       project_stages[]
  gate_results         gate_results[]
  issues               issues[]
  bom_items            bom_items[]
  risks                risks[]
  cost_items           cost_items[]
  landed_costs         landed_costs[]
  documents            documents[]
  eta_tracking         eta_tracking[]
  customer_orders      customer_orders[]
  quality_audits       quality_audits[]
  lessons_learned      lessons_learned[]
  customer_variations  customer_variations[]
  project_partners     project_partners[]
}

model project_stages {
  id           String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id   String
  stage_number Int
  stage_name   String
  status       String   @default("pending")
  started_at   DateTime? @db.Timestamp(6)
  completed_at DateTime? @db.Timestamp(6)
  notes        String?

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model customers {
  id             String   @id @default(dbgenerated("gen_random_uuid()"))
  customer_code  String?  @unique
  name           String
  contact_person String?
  email          String?
  phone          String?
  address        String?
  created_at     DateTime @default(now()) @db.Timestamp(6)

  projects projects[]
}

model gates {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  gate_number   Int      @unique
  name_zh       String?
  name_en       String?
  trigger_stage Int
  description   String?

  gate_conditions gate_conditions[]
  gate_results    gate_results[]
}

model gate_conditions {
  id             String   @id @default(dbgenerated("gen_random_uuid()"))
  gate_id        String
  condition_type String
  required       Boolean  @default(true)
  config         Json?
  sort_order     Int      @default(0)

  gate gates @relation(fields: [gate_id], references: [id], onDelete: Cascade)
}

model gate_results {
  id           String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id   String
  gate_id      String
  result       String
  evaluated_by String?
  evaluated_at DateTime? @db.Timestamp(6)
  reason       String?
  issue_id     String?
  created_at   DateTime @default(now()) @db.Timestamp(6)

  project        projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  gate           gates    @relation(fields: [gate_id], references: [id])
  gate_overrides gate_overrides[]
}

model gate_overrides {
  id              String   @id @default(dbgenerated("gen_random_uuid()"))
  gate_result_id  String
  project_id      String
  overridden_by   String
  overridden_at   DateTime @default(now()) @db.Timestamp(6)
  original_result String
  new_result      String
  reason          String
  risk_acceptance String
  approver_name   String
  is_exceptional  Boolean  @default(true)
  created_at      DateTime @default(now()) @db.Timestamp(6)

  gate_result gate_results @relation(fields: [gate_result_id], references: [id])
}

model issues {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id    String
  issue_number  String   @unique
  title         String
  description   String?
  category      String
  severity      String   @default("high")
  owner_id      String?
  status        String   @default("open")
  due_date      DateTime? @db.Date
  resolved_at   DateTime? @db.Timestamp(6)
  created_at    DateTime @default(now()) @db.Timestamp(6)
  created_by    String?

  project            projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  owner              users?   @relation("issues_owner", fields: [owner_id], references: [id])
  corrective_actions corrective_actions[]
}

model corrective_actions {
  id                 String   @id @default(dbgenerated("gen_random_uuid()"))
  issue_id           String
  action_description String
  owner_id           String?
  due_date           DateTime? @db.Date
  completed_at       DateTime? @db.Timestamp(6)
  status             String   @default("pending")
  verified_by        String?
  created_at         DateTime @default(now()) @db.Timestamp(6)

  issue issues @relation(fields: [issue_id], references: [id], onDelete: Cascade)
}

model quality_audits {
  id               String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id       String
  audit_number     String   @unique
  stage_number     Int
  auditor_id       String?
  result           String   @default("pending")
  audit_date       DateTime? @db.Date
  findings_summary String?
  next_audit_id    String?
  created_at       DateTime @default(now()) @db.Timestamp(6)

  project     projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  audit_items audit_items[]
}

model audit_items {
  id                String   @id @default(dbgenerated("gen_random_uuid()"))
  audit_id          String
  item_name         String
  category          String?
  expected_standard String?
  result            String   @default("pending")
  finding_details   String?
  photo_evidence    String?
  is_critical       Boolean  @default(false)
  sort_order        Int      @default(0)
  created_at        DateTime @default(now()) @db.Timestamp(6)

  audit quality_audits @relation(fields: [audit_id], references: [id], onDelete: Cascade)
}

model bom_items {
  id             String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id     String
  item_code      String
  product_name   String
  specification  String?
  quantity       Int
  unit           String?
  supplier_id    String?
  unit_cost      Decimal? @db.Decimal(12, 2)
  total_cost     Decimal? @db.Decimal(15, 2)
  lead_time_days Int?
  is_critical    Boolean  @default(false)
  planned_eta    DateTime? @db.Date
  forecast_eta   DateTime? @db.Date
  actual_arrival DateTime? @db.Date
  status         String   @default("pending")
  qc_status      String   @default("pending")
  created_at     DateTime @default(now()) @db.Timestamp(6)
  updated_at     DateTime @default(now()) @db.Timestamp(6)

  project  projects   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  supplier suppliers? @relation(fields: [supplier_id], references: [id])
}

model suppliers {
  id             String   @id @default(dbgenerated("gen_random_uuid()"))
  supplier_code  String   @unique
  name           String
  contact_person String?
  email          String?
  phone          String?
  address        String?
  category       String   @default("C")
  overall_score  Decimal? @db.Decimal(4, 2)
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now()) @db.Timestamp(6)

  bom_items        bom_items[]
  supplier_ratings supplier_ratings[]
}

model supplier_ratings {
  id                  String   @id @default(dbgenerated("gen_random_uuid()"))
  supplier_id         String
  quality_score       Decimal? @db.Decimal(4, 2)
  price_score         Decimal? @db.Decimal(4, 2)
  reliability_score   Decimal? @db.Decimal(4, 2)
  lead_time_score     Decimal? @db.Decimal(4, 2)
  communication_score Decimal? @db.Decimal(4, 2)
  after_sales_score   Decimal? @db.Decimal(4, 2)
  weighted_score      Decimal? @db.Decimal(5, 2)
  rated_by            String?
  rated_at            DateTime? @db.Date
  created_at          DateTime @default(now()) @db.Timestamp(6)

  supplier suppliers @relation(fields: [supplier_id], references: [id], onDelete: Cascade)
}

model partners {
  id             String   @id @default(dbgenerated("gen_random_uuid()"))
  partner_code   String   @unique
  name           String
  type           String
  contact_person String?
  phone          String?
  email          String?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now()) @db.Timestamp(6)

  qualifications   qualifications[]
  project_partners project_partners[]
}

model qualification_types {
  id                       String   @id @default(dbgenerated("gen_random_uuid()"))
  type_code                String   @unique
  name_zh                  String
  name_en                  String?
  applicable_partner_types Json
  description              String?
  is_required              Boolean  @default(true)
  created_at               DateTime @default(now()) @db.Timestamp(6)

  qualifications qualifications[]
}

model qualifications {
  id                    String   @id @default(dbgenerated("gen_random_uuid()"))
  partner_id            String
  qualification_type_id String
  licence_number        String?
  issuing_authority     String?
  issue_date            DateTime? @db.Date
  expiry_date           DateTime @db.Date
  status                String   @default("valid")
  document_url          String?
  created_at            DateTime @default(now()) @db.Timestamp(6)

  partner            partners            @relation(fields: [partner_id], references: [id], onDelete: Cascade)
  qualification_type qualification_types @relation(fields: [qualification_type_id], references: [id])
}

model project_partners {
  id               String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id       String
  partner_id       String
  assigned_stage   Int
  assigned_date    DateTime @db.Date
  status           String   @default("active")
  responsibility   String?
  completion_notes String?
  completed_at     DateTime? @db.Timestamp(6)
  remarks          String?
  created_at       DateTime @default(now()) @db.Timestamp(6)
  created_by       String?

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  partner partners @relation(fields: [partner_id], references: [id])
}

model landed_costs {
  id                      String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id              String
  version                 Int      @default(1)
  factory_cost            Decimal  @default(0) @db.Decimal(15, 2)
  china_inland_transport  Decimal  @default(0) @db.Decimal(15, 2)
  qc_cost                 Decimal  @default(0) @db.Decimal(15, 2)
  packing_cost            Decimal  @default(0) @db.Decimal(15, 2)
  consolidation_cost      Decimal  @default(0) @db.Decimal(15, 2)
  international_freight   Decimal  @default(0) @db.Decimal(15, 2)
  insurance               Decimal  @default(0) @db.Decimal(15, 2)
  import_customs          Decimal  @default(0) @db.Decimal(15, 2)
  taxes                   Decimal  @default(0) @db.Decimal(15, 2)
  singapore_delivery      Decimal  @default(0) @db.Decimal(15, 2)
  installation_cost       Decimal  @default(0) @db.Decimal(15, 2)
  warranty_provision      Decimal  @default(0) @db.Decimal(15, 2)
  project_management_cost Decimal  @default(0) @db.Decimal(15, 2)
  company_overhead        Decimal  @default(0) @db.Decimal(15, 2)
  total_landed_cost       Decimal  @db.Decimal(15, 2)
  selling_price           Decimal? @db.Decimal(15, 2)
  gross_margin            Decimal? @db.Decimal(15, 2)
  margin_percent          Decimal? @db.Decimal(5, 2)
  is_current              Boolean  @default(true)
  created_at              DateTime @default(now()) @db.Timestamp(6)
  created_by              String?

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model cost_items {
  id         String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id String
  item_name  String
  amount     Decimal  @db.Decimal(15, 2)
  category   String
  created_at DateTime @default(now()) @db.Timestamp(6)
  updated_at DateTime @default(now()) @db.Timestamp(6)

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model risks {
  id              String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id      String
  risk_number     String   @unique
  category        String
  description     String
  probability     Int?
  impact          Int?
  risk_level      String?
  owner_id        String?
  mitigation_plan String?
  due_date        DateTime? @db.Date
  status          String   @default("open")
  created_at      DateTime @default(now()) @db.Timestamp(6)
  created_by      String?

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model customer_orders {
  id                     String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id             String
  order_number           String   @unique
  order_date             DateTime @db.Date
  order_amount           Decimal  @db.Decimal(15, 2)
  deposit_required       Decimal  @db.Decimal(15, 2)
  payment_status         String   @default("pending_deposit")
  customer_approved      Boolean  @default(false)
  customer_approval_date DateTime? @db.Date
  confirmed_by           String?
  confirmed_at           DateTime? @db.Timestamp(6)
  notes                  String?
  created_at             DateTime @default(now()) @db.Timestamp(6)
  updated_at             DateTime @default(now()) @db.Timestamp(6)
  created_by             String?

  project           projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
  customer_deposits customer_deposits[]
}

model customer_deposits {
  id               String   @id @default(dbgenerated("gen_random_uuid()"))
  order_id         String
  deposit_amount   Decimal  @db.Decimal(15, 2)
  received_date    DateTime @db.Date
  payment_method   String?
  reference_number String?
  received_by      String?
  notes            String?
  created_at       DateTime @default(now()) @db.Timestamp(6)

  order customer_orders @relation(fields: [order_id], references: [id], onDelete: Cascade)
}

model documents {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id    String
  document_type String
  file_name     String
  file_path     String
  file_size     BigInt?
  mime_type     String?
  uploaded_by   String?
  uploaded_at   DateTime @default(now()) @db.Timestamp(6)
  notes         String?

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model document_type_permissions {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  document_type String
  role          String
  can_read      Boolean  @default(false)
  can_upload    Boolean  @default(false)
  can_delete    Boolean  @default(false)
  scope         String   @default("all")
  created_at    DateTime @default(now()) @db.Timestamp(6)
}

model eta_tracking {
  id              String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id      String
  bom_item_id     String?
  shipment_id     String?
  planned_eta     DateTime? @db.Date
  forecast_eta    DateTime? @db.Date
  actual_arrival  DateTime? @db.Date
  variance_days   Int?
  alert_triggered Boolean  @default(false)
  created_at      DateTime @default(now()) @db.Timestamp(6)
  updated_at      DateTime @default(now()) @db.Timestamp(6)

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model shipments {
  id                String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id        String
  shipment_number   String?  @unique
  carrier           String?
  tracking_number   String?
  shipped_at        DateTime? @db.Date
  estimated_arrival DateTime? @db.Date
  actual_arrival    DateTime? @db.Date
  status            String   @default("pending")
}

model audit_logs {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  user_id       String?
  action        String
  resource_type String
  resource_id   String?
  before_value  Json?
  after_value   Json?
  reason        String?
  ip_address    String?
  created_at    DateTime @default(now()) @db.Timestamp(6)

  user users? @relation("audit_logs_created_by", fields: [user_id], references: [id])
}

model lessons_learned {
  id         String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id String
  category   String?
  content    String
  is_sop     Boolean  @default(false)
  created_by String?
  created_at DateTime @default(now()) @db.Timestamp(6)

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}

model customer_variations {
  id                   String   @id @default(dbgenerated("gen_random_uuid()"))
  project_id           String
  variation_number     String   @unique
  description          String
  requested_by         String?
  reviewed_by          String?
  cost_impact          Decimal  @default(0) @db.Decimal(15, 2)
  schedule_impact_days Int      @default(0)
  customer_approved    Boolean  @default(false)
  approved_at          DateTime? @db.Timestamp(6)
  status               String   @default("pending")
  updated_bom_id       String?
  updated_quotation_id String?
  created_at           DateTime @default(now()) @db.Timestamp(6)

  project projects @relation(fields: [project_id], references: [id], onDelete: Cascade)
}
'''

path = r'C:/Users/danni/Documents/kimi/workspace/ees-v01-alpha/prisma/schema.prisma'
with open(path, 'w', encoding='utf-8') as f:
    f.write(schema)
print(f'Written clean schema: {len(schema)} chars, {len(schema.splitlines())} lines')
