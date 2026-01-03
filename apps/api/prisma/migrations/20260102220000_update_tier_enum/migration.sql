-- Update AuditTier enum: QUICK_SCAN → SCAN, STANDARD → AUDIT, add FREE
-- No backward compatibility needed (no existing customers)

-- Create new enum
CREATE TYPE "AuditTier_new" AS ENUM ('FREE', 'SCAN', 'AUDIT', 'DEEP_DIVE');

-- Update column to use new enum (map old values)
ALTER TABLE "Audit" ALTER COLUMN "tier" TYPE "AuditTier_new" USING (
  CASE "tier"::text
    WHEN 'QUICK_SCAN' THEN 'SCAN'::"AuditTier_new"
    WHEN 'STANDARD' THEN 'AUDIT'::"AuditTier_new"
    WHEN 'DEEP_DIVE' THEN 'DEEP_DIVE'::"AuditTier_new"
  END
);

-- Drop old enum and rename new
DROP TYPE "AuditTier";
ALTER TYPE "AuditTier_new" RENAME TO "AuditTier";
