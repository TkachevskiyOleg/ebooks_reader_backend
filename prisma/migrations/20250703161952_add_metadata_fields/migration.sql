/*
  Warnings:

  - You are about to drop the column `coverPath` on the `Book` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Book" DROP COLUMN "coverPath",
ADD COLUMN     "language" TEXT,
ADD COLUMN     "publisher" TEXT;
