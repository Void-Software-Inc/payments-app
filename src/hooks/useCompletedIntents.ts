import { useState, useCallback } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { createAuthMessage } from '@/lib/auth'
import { CreateIntentData } from '@/services/intents'

export interface CompletedIntent {
  id: string
  intentId: string
  walletAddress: string
  merchantId: string
  type: string
  amount: string
  coinType: string
  description?: string
  sender?: string
  recipient?: string
  tipAmount?: string
  txHash?: string
  createdAt: string
  executedAt: string
}

export function useCompletedIntents() {
  const [isLoading, setIsLoading] = useState(false)
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

  const saveCompletedIntent = useCallback(async (intentData: CreateIntentData) => {
    setIsLoading(true)
    setError(null)

    try {
      const authParams = await createAuthParams('save-intent')

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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save intent')
      }

      const { intent } = await response.json()
      return intent as CompletedIntent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [createAuthParams])

  const getCompletedIntents = useCallback(async (merchantId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const authParams = await createAuthParams('get-intents')
      
      const params = new URLSearchParams({
        ...authParams,
        ...(merchantId && { merchantId }),
      })

      const response = await fetch(`/api/completed-intents?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch intents')
      }

      const { intents } = await response.json()
      return intents as CompletedIntent[]
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [createAuthParams])

  const getCompletedIntent = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const authParams = await createAuthParams('get-intent')
      
      const params = new URLSearchParams(authParams)

      const response = await fetch(`/api/completed-intents/${id}?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch intent')
      }

      const { intent } = await response.json()
      return intent as CompletedIntent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [createAuthParams])

  return {
    saveCompletedIntent,
    getCompletedIntents,
    getCompletedIntent,
    isLoading,
    error,
  }
} 