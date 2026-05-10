-- CreateEnum
CREATE TYPE "ReplySenderType" AS ENUM ('agent', 'customer');

-- CreateTable
CREATE TABLE "replies" (
    "id" SERIAL NOT NULL,
    "body" TEXT NOT NULL,
    "senderType" "ReplySenderType" NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
