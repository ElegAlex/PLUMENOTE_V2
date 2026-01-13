-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'file-text',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Template_isSystem_idx" ON "Template"("isSystem");

-- CreateIndex
CREATE INDEX "Template_createdById_idx" ON "Template"("createdById");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
