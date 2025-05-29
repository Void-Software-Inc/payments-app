import { prisma } from '@/lib/db'
import { CompletedIntent } from '../generated/prisma'

export interface CreateIntentData {
  intentId: string
  walletAddress: string
  merchantId: string
  type: 'payment' | 'withdrawal'
  amount: string
  coinType: string
  description?: string
  sender?: string
  recipient?: string
  tipAmount?: string
  txHash?: string
}

export async function createCompletedIntent(data: CreateIntentData): Promise<CompletedIntent> {
  return await prisma.completedIntent.create({
    data: {
      intentId: data.intentId,
      walletAddress: data.walletAddress,
      merchantId: data.merchantId,
      type: data.type,
      amount: data.amount,
      coinType: data.coinType,
      description: data.description,
      sender: data.sender,
      recipient: data.recipient,
      tipAmount: data.tipAmount,
      txHash: data.txHash,
    },
  })
}

export async function getCompletedIntents(
  walletAddress: string,
  merchantId?: string
): Promise<CompletedIntent[]> {
  const where: any = merchantId ? { merchantId } : { walletAddress }
  
  return await prisma.completedIntent.findMany({
    where,
    orderBy: { executedAt: 'desc' },
  })
}

export async function getCompletedIntent(
  intentId: string,
  walletAddress: string
): Promise<CompletedIntent | null> {
  return await prisma.completedIntent.findFirst({
    where: {
      intentId,
      walletAddress,
    },
  })
}

export async function getCompletedIntentById(
  id: string,
  walletAddress: string
): Promise<CompletedIntent | null> {
  return await prisma.completedIntent.findFirst({
    where: {
      id,
      walletAddress,
    },
  })
}

export async function deleteCompletedIntent(
  intentId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    await prisma.completedIntent.delete({
      where: {
        intentId,
        walletAddress,
      },
    })
    return true
  } catch {
    return false
  }
} 