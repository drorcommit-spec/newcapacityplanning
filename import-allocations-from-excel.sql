-- Auto-generated from abcd.xlsx
-- 111 allocations to insert
-- Run this AFTER ensuring all projects and team members exist in the database

-- Step 1: Insert allocations using project name matching and employee name matching

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Adapt global studios (AI Asses%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Administration (HRS,Hubspot,  %'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%AI and Presell%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Aires (AI Assess RAPID)%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Aires (AI Assess RAPID)%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Einat Asic [Mishki Ram] - SW D%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Einat Asic [Mishki Ram] - SW D%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Einat Asic [Mishki Ram] - SW D%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 7, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Einat Asic [Mishki Ram] - SW D%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Black widow - (signed on nov 2%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Black widow - (signed on nov 2%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Black Widow MVP (16.01)%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%BMT%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CBC (T&M)%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CBC (T&M)%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Ceel%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Elcam - Delivery%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%FuturePACS assess%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%FuturePACS assess%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%HRS%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%HRS%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%HRS%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Hyp%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Hyp%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Hyp%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IAI (POC) - 23 hr%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IBI Roeto MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IBI Roeto MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IBI Roeto MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IBI searchfund MVP%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%IBI Transactions MVP%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Lake (MVP)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Mishki Ram - Barak [3.11]%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%OptionUp POC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%OptionUp POC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%OptionUp POC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Patient7 ($125K MVP)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Patient7 ($125K MVP)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Patient7 ($125K MVP)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Paz Gaz%'
  AND tm.full_name ILIKE '%Stav%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Presale%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%RodRadar%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%RodRadar%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  75,
  7.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%RodRadar%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Septier%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Septier%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Septier%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SignetureDX%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SignetureDX%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SignetureDX%'
  AND tm.full_name ILIKE '%Dror%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Smart Girls PoC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Smart Girls PoC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Smart Girls PoC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (BO)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (BO)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  50,
  5.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (BO)%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (Pharmacy)%'
  AND tm.full_name ILIKE '%Shachar%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (Pharmacy)%'
  AND tm.full_name ILIKE '%Shachar%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (Pharmacy)%'
  AND tm.full_name ILIKE '%Shachar%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (POS)%'
  AND tm.full_name ILIKE '%Ariel R%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (POS)%'
  AND tm.full_name ILIKE '%Ariel R%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  100,
  10.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%SuperPharm (POS)%'
  AND tm.full_name ILIKE '%Ariel R%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Tadiran%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Tadiran%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Tadiran%'
  AND tm.full_name ILIKE '%Miri%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%GradIT  PoC%'
  AND tm.full_name ILIKE '%Tony%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Lightship - MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Lightship - MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Lightship - MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Linkme POC%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Open University%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Open University%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Open University%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Open University%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Seacure ZEN%'
  AND tm.full_name ILIKE '%Sarah%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%ImmuniSense PoC%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%ImmuniSense PoC%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%ImmuniSense PoC%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Malmab%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Malmab%'
  AND tm.full_name ILIKE '%Don%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Flexfactor MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Flexfactor MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Benchmark MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Benchmark MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Benchmark MVP%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Ryvid MVP signed 31/3%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Ryvid MVP signed 31/3%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Ryvid MVP signed 31/3%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Energyby5%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Energyby5%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Energyby5%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  5,
  0.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%StoreNext%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  25,
  2.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%StoreNext%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%StoreNext%'
  AND tm.full_name ILIKE '%Daniel N%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Greywolf AI POC ( signed - 27.%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  15,
  1.5,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Greywolf AI POC ( signed - 27.%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  20,
  2.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Vivaium - SW Discovery%'
  AND tm.full_name ILIKE '%Maor%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 6, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 7, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 7, 2,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 8, 1,
  30,
  3.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%CryptoC (SW)%'
  AND tm.full_name ILIKE '%Adi%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Rezora AI Assess 5K%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  2026, 5, 1,
  10,
  1.0,
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%Flexible AI Assess (14.4)%'
  AND tm.full_name ILIKE '%Igal%'
  AND tm.is_active = true
LIMIT 1;

-- Verify
SELECT COUNT(*) as imported_allocations FROM allocations WHERE created_by = 'excel-import';
