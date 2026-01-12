-- DropIndex
DROP INDEX "Note_searchVector_idx";

-- CreateTable
CREATE TABLE "UserNoteView" (
    "id" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,

    CONSTRAINT "UserNoteView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNoteView_userId_viewedAt_idx" ON "UserNoteView"("userId", "viewedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserNoteView_userId_noteId_key" ON "UserNoteView"("userId", "noteId");

-- AddForeignKey
ALTER TABLE "UserNoteView" ADD CONSTRAINT "UserNoteView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNoteView" ADD CONSTRAINT "UserNoteView_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
