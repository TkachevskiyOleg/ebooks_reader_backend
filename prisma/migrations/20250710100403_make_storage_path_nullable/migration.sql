/*
  Warnings:

  - A unique constraint covering the columns `[storagePath]` on the table `Book` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "originalFilePath" TEXT,
ADD COLUMN     "storagePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Book_storagePath_key" ON "Book"("storagePath");
