-- Story 8.5: Ensure each user can only have one personal workspace
-- This is a partial unique index that only applies when isPersonal = true
CREATE UNIQUE INDEX "Workspace_ownerId_isPersonal_unique"
ON "Workspace" ("ownerId")
WHERE "isPersonal" = true;
