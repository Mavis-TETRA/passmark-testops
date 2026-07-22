CREATE TEMP TABLE "_PassmarkSeededCases" ON COMMIT DROP AS
SELECT test_case."id"
FROM "TestCase" AS test_case
JOIN (
  VALUES
    ('SMK-001', 'Target loads successfully'),
    ('SMK-002', 'Primary navigation is available'),
    ('SMK-003', 'Critical action completes'),
    ('REG-001', 'Page has no blocking console errors'),
    ('REG-002', 'Required validation is clear'),
    ('REG-003', 'Keyboard navigation remains usable')
) AS seeded("code", "name")
  ON seeded."code" = test_case."code" AND seeded."name" = test_case."name"
WHERE test_case."description" = test_case."name"
  AND test_case."actualResult" = ''
  AND test_case."defectId" = ''
  AND test_case."assignee" = ''
  AND test_case."reviewer" = ''
  AND test_case."notes" = ''
  AND ABS(EXTRACT(EPOCH FROM (test_case."updatedAt" - test_case."createdAt"))) < 1;

UPDATE "TestPack" AS pack
SET "caseIds" = COALESCE((
  SELECT jsonb_agg(item."value")::text
  FROM jsonb_array_elements_text(pack."caseIds"::jsonb) AS item("value")
  WHERE item."value" NOT IN (SELECT "id" FROM "_PassmarkSeededCases")
), '[]');

DELETE FROM "TestCase"
WHERE "id" IN (SELECT "id" FROM "_PassmarkSeededCases");
