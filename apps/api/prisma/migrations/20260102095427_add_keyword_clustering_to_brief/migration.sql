-- AlterTable
ALTER TABLE "Brief" ADD COLUMN     "clusteredKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totalClusterVolume" INTEGER NOT NULL DEFAULT 0;
