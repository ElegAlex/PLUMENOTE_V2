-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_isPersonal_idx" ON "Workspace"("isPersonal");

-- CreateIndex
CREATE INDEX "Folder_workspaceId_idx" ON "Folder"("workspaceId");

-- CreateIndex
CREATE INDEX "Note_workspaceId_idx" ON "Note"("workspaceId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
