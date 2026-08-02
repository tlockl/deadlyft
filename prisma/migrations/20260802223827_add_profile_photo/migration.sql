-- CreateTable
CREATE TABLE "ProfilePhoto" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "data" BLOB NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfilePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
