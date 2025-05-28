-- CreateTable
CREATE TABLE "completed_intents" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "coinType" TEXT NOT NULL,
    "description" TEXT,
    "sender" TEXT,
    "recipient" TEXT,
    "tipAmount" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completed_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "completed_intents_intentId_key" ON "completed_intents"("intentId");

-- CreateIndex
CREATE INDEX "completed_intents_walletAddress_idx" ON "completed_intents"("walletAddress");

-- CreateIndex
CREATE INDEX "completed_intents_merchantId_idx" ON "completed_intents"("merchantId");

-- CreateIndex
CREATE INDEX "completed_intents_intentId_idx" ON "completed_intents"("intentId");
