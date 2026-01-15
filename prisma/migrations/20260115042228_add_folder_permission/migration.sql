-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FolderPermission" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FolderPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FolderPermission_folderId_idx" ON "FolderPermission"("folderId");

-- CreateIndex
CREATE INDEX "FolderPermission_userId_idx" ON "FolderPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderPermission_folderId_userId_key" ON "FolderPermission"("folderId", "userId");

-- CreateIndex
CREATE INDEX "Folder_isPrivate_idx" ON "Folder"("isPrivate");

-- AddForeignKey
ALTER TABLE "FolderPermission" ADD CONSTRAINT "FolderPermission_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderPermission" ADD CONSTRAINT "FolderPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
