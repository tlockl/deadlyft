-- CreateTable
CREATE TABLE "MovementNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovementNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MovementNote_userId_key_key" ON "MovementNote"("userId", "key");
