-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedByAi" BOOLEAN NOT NULL DEFAULT false;
