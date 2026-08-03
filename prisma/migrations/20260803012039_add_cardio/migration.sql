-- CreateTable
CREATE TABLE "CardioEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "targetSec" INTEGER,
    CONSTRAINT "CardioEntry_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CardioEntry_workoutId_idx" ON "CardioEntry"("workoutId");
