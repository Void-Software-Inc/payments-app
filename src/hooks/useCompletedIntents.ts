import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { Intent } from "@account.tech/core"
import { CompletedIntent } from '@/generated/prisma'
import { createAuthMessage } from '@/lib/auth'

interface UseCompletedIntentsReturn {
  completedIntents: CompletedIntent[]
  isLoading: boolean
  error: string | null
  addCompletedIntent: (intent: Intent, paymentId: string, txHash?: string) => Promise<void>
  getCompletedIntent: (paymentId: string) => CompletedIntent | undefined
  refreshIntents: () => Promise<void>
}

export function useCompletedIntents(merchantId?: string): UseCompletedIntentsReturn {
  const [completedIntents, setCompletedIntents] = useState<CompletedIntent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentAccount = useCurrentAccount()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

  const createAuthParams = useCallback(async (action: string) => {
    if (!currentAccount?.address) {
      throw new Error('Wallet not connected')
    }

    const message = createAuthMessage(currentAccount.address, action)
    
    try {
      const result = await signPersonalMessage({
        message: new TextEncoder().encode(message),
      })

      return {
        walletAddress: currentAccount.address,
        message,
        signature: result.signature,
        publicKey: currentAccount.publicKey ? 
          Array.from(currentAccount.publicKey).map(b => b.toString(16).padStart(2, '0')).join('') : 
          currentAccount.address, // Fallback to address if no publicKey
      }
    } catch (error) {
      throw new Error('Failed to sign message')
    }
  }, [currentAccount, signPersonalMessage])

  const fetchCompletedIntents = useCallback(async () => {
    if (!currentAccount?.address) {
      setCompletedIntents([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // For now, skip authentication for read operations to avoid wallet popup issues
      const authParams = {
        walletAddress: currentAccount.address,
        message: '',
        signature: '',
        publicKey: ''
      }

      const params = new URLSearchParams(authParams)

      if (merchantId) {
        params.append('merchantId', merchantId)
      }

      console.log('Fetching completed intents with params:', params.toString())
      
      const response = await fetch(`/api/completed-intents?${params}`)
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Failed to fetch completed intents: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Received data:', data)
      setCompletedIntents(data.intents || [])
    } catch (err) {
      console.error('Error fetching completed intents:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch completed intents')
      setCompletedIntents([])
    } finally {
      setIsLoading(false)
    }
  }, [currentAccount?.address, merchantId, createAuthParams])

  const addCompletedIntent = useCallback(async (intent: Intent, paymentId: string, txHash?: string) => {
    if (!currentAccount?.address) {
      throw new Error('No wallet connected')
    }

    try {
      const authParams = await createAuthParams('save-intent')

      // Determine if this is a withdrawal based on intent type
      const isWithdrawal = intent.fields?.type_?.includes('WithdrawAndTransferIntent')
      
      const intentData = {
        intentId: paymentId,
        walletAddress: currentAccount.address,
        merchantId: intent.account || merchantId || '',
        type: isWithdrawal ? 'withdrawal' : 'payment',
        amount: (intent.args as any)?.amount?.toString() || '0',
        coinType: (intent.args as any)?.coinType || '',
        description: intent.fields?.description || '',
        sender: intent.fields?.creator || currentAccount.address,
        recipient: isWithdrawal ? (intent.args as any)?.recipient : intent.account,
        tipAmount: (intent.args as any)?.tip?.toString() || '0',
        txHash,
      }

      const response = await fetch('/api/completed-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intentData,
          ...authParams,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save completed intent: ${response.statusText}`)
      }

      // Refresh the intents list
      await fetchCompletedIntents()
    } catch (err) {
      console.error('Error adding completed intent:', err)
      throw err
    }
  }, [currentAccount?.address, merchantId, createAuthParams, fetchCompletedIntents])

  const getCompletedIntent = useCallback((paymentId: string) => {
    return completedIntents.find(intent => intent.intentId === paymentId)
  }, [completedIntents])

  const refreshIntents = useCallback(async () => {
    await fetchCompletedIntents()
  }, [fetchCompletedIntents])

  useEffect(() => {
    fetchCompletedIntents()
  }, [fetchCompletedIntents])

  return {
    completedIntents,
    isLoading,
    error,
    addCompletedIntent,
    getCompletedIntent,
    refreshIntents,
  }
} 