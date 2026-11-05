-- CreateTable
CREATE TABLE "Patron" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reader',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Work" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorLife" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "roomKey" TEXT NOT NULL,
    "roomLabel" TEXT NOT NULL,
    "gutenbergId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Retrieval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patronId" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Retrieval_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Patron" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Retrieval_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuestRetrieval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestRetrieval_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShelfItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patronId" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'to-read',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShelfItem_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Patron" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShelfItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patronId" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "locator" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pin_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Patron" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pin_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patronId" TEXT NOT NULL,
    "workIds" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'to-read',
    "state" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "Patron" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Patron_email_key" ON "Patron"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");

-- CreateIndex
CREATE INDEX "Work_roomKey_idx" ON "Work"("roomKey");

-- CreateIndex
CREATE INDEX "Work_author_idx" ON "Work"("author");

-- CreateIndex
CREATE UNIQUE INDEX "Retrieval_patronId_workId_key" ON "Retrieval"("patronId", "workId");

-- CreateIndex
CREATE INDEX "GuestRetrieval_ip_idx" ON "GuestRetrieval"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "GuestRetrieval_ip_workId_key" ON "GuestRetrieval"("ip", "workId");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfItem_patronId_workId_key" ON "ShelfItem"("patronId", "workId");

-- CreateIndex
CREATE INDEX "Pin_patronId_idx" ON "Pin"("patronId");
