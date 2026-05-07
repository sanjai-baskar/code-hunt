-- Migration: Replace DistractionLog with DistractionSummary + Add SiteSettings
-- Run this in your Neon PostgreSQL SQL Editor

-- 1. Drop old DistractionLog table (and its data)
DROP TABLE IF EXISTS "DistractionLog" CASCADE;

-- 2. Create lightweight DistractionSummary table
CREATE TABLE IF NOT EXISTS "DistractionSummary" (
    "id"               TEXT NOT NULL,
    "studentId"        TEXT NOT NULL,
    "problemId"        TEXT NOT NULL,
    "hadDistraction"   BOOLEAN NOT NULL DEFAULT false,
    "distractionCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DistractionSummary_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DistractionSummary_studentId_problemId_key" UNIQUE ("studentId", "problemId"),
    CONSTRAINT "DistractionSummary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "DistractionSummary_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE
);

-- 3. Create SiteSettings table (global webcam toggle)
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    "id"           TEXT NOT NULL DEFAULT 'global',
    "webcamEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- 4. Seed default settings row
INSERT INTO "SiteSettings" ("id", "webcamEnabled")
VALUES ('global', true)
ON CONFLICT ("id") DO NOTHING;

-- 5. Fix Submission foreign keys to use CASCADE (safety)
ALTER TABLE "Submission"
    DROP CONSTRAINT IF EXISTS "Submission_studentId_fkey",
    ADD CONSTRAINT "Submission_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "Submission"
    DROP CONSTRAINT IF EXISTS "Submission_problemId_fkey",
    ADD CONSTRAINT "Submission_problemId_fkey"
        FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE;
