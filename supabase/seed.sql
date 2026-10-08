-- ==============================================================================
-- SAP-Style CRM / Customs Process Management System
-- Seed Data: seed.sql
-- ==============================================================================

-- 1. TEAMS SEED
INSERT INTO public.teams (id, team_name, description, status) VALUES
    ('11111111-1111-1111-1111-111111111101', 'Air Freight Customs', 'Specialized team handling airport customs clearance and import/export manifests', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111102', 'Ocean Freight Clearance', 'Sea port container declarations, MABL/OBL processing, and terminal clearances', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111103', 'Cross-Border Trucking', 'Land checkpoint declarations, bonded transport, and transit permits', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111104', 'HQ Compliance & Audit', 'Central customs audit, dispute resolution, NOD/VDP processing, and legal liaison', 'ACTIVE')
ON CONFLICT (team_name) DO NOTHING;

-- 2. MASTER DATA SEED
INSERT INTO public.master_data (category, value, display_order, active) VALUES
    -- Divisions
    ('DIVISION', 'Air Freight', 1, true),
    ('DIVISION', 'Ocean Freight', 2, true),
    ('DIVISION', 'Land Transport / Logistics', 3, true),
    ('DIVISION', 'Contract Logistics (3PL)', 4, true),
    ('DIVISION', 'Customs Brokerage Services', 5, true),

    -- Issue Categories
    ('ISSUE_CATEGORY', 'VDP (Voluntary Disclosure Program)', 1, true),
    ('ISSUE_CATEGORY', 'NOD (Notice of Demand)', 2, true),
    ('ISSUE_CATEGORY', 'Customs Refund Claim', 3, true),
    ('ISSUE_CATEGORY', 'Compound & Penalty Notice', 4, true),
    ('ISSUE_CATEGORY', 'Tariff Classification Dispute', 5, true),
    ('ISSUE_CATEGORY', 'Valuation / Transfer Pricing Query', 6, true),
    ('ISSUE_CATEGORY', 'Permit Expiry / Non-Compliance', 7, true),

    -- Error Categories
    ('ERROR_CATEGORY', 'HS Code Misclassification', 1, true),
    ('ERROR_CATEGORY', 'Incorrect Invoice Valuation / Currency', 2, true),
    ('ERROR_CATEGORY', 'Late Declaration Submission', 3, true),
    ('ERROR_CATEGORY', 'Missing Strategic Trade Permit (STA)', 4, true),
    ('ERROR_CATEGORY', 'Discrepancy in Gross Weight / Package Count', 5, true),
    ('ERROR_CATEGORY', 'Inaccurate Country of Origin Certificate', 6, true),
    ('ERROR_CATEGORY', 'Documentation Inconsistency (BL vs Inv)', 7, true),
    ('ERROR_CATEGORY', 'Clerical Data Entry Typo', 8, true),

    -- Ownership
    ('OWNERSHIP', 'LSP / Broker Responsibility', 1, true),
    ('OWNERSHIP', 'Customer / Shipper Oversight', 2, true),
    ('OWNERSHIP', 'Customs Authority Query', 3, true),
    ('OWNERSHIP', 'Port Operator / Terminal Agent', 4, true),
    ('OWNERSHIP', 'Shared Responsibility', 5, true),

    -- Status
    ('STATUS', 'Open', 1, true),
    ('STATUS', 'In Progress', 2, true),
    ('STATUS', 'Submitted', 3, true),
    ('STATUS', 'Under Review', 4, true),
    ('STATUS', 'Approved', 5, true),
    ('STATUS', 'Rejected', 6, true),
    ('STATUS', 'Completed', 7, true),
    ('STATUS', 'Closed', 8, true)
ON CONFLICT (category, value) DO NOTHING;

-- 3. PROFILES SEED (Default accounts for the 4 roles)
INSERT INTO public.profiles (id, username, email, full_name, role, team_id, status) VALUES
    ('22222222-2222-2222-2222-222222222201', 'admin.customs', 'admin@customs-flow.corp', 'Alexander Ross (System Administrator)', 'ADMIN', '11111111-1111-1111-1111-111111111104', 'ACTIVE'),
    ('22222222-2222-2222-2222-222222222202', 'hq.director', 'hq.compliance@customs-flow.corp', 'Dr. Evelyn Tan (HQ Head of Compliance)', 'HQ', '11111111-1111-1111-1111-111111111104', 'ACTIVE'),
    ('22222222-2222-2222-2222-222222222203', 'pco.specialist', 'pco.specialist@customs-flow.corp', 'Marcus Vance (PCO Process Officer)', 'PCO', '11111111-1111-1111-1111-111111111101', 'ACTIVE'),
    ('22222222-2222-2222-2222-222222222204', 'team.ocean', 'team.ocean@customs-flow.corp', 'Sarah Jenkins (Ocean Operations Specialist)', 'TEAM', '11111111-1111-1111-1111-111111111102', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;
