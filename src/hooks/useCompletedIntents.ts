import { useState, useEffect, useCallback } from 'react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { Intent } from "@account.tech/core"
import { CompletedIntent } from '@/generated/prisma'
import { createAuthMessage } from '@/lib/auth'
import { usePaymentClient } from './usePaymentClient'

interface UseCompletedIntentsReturn {
  completedIntents: CompletedIntent[]
  isLoading: boolean
  error: string | null
  addCompletedIntent: (intent: Intent, paymentId: string, txHash?: string, displayData?: { amount: string, coinType: string, recipient?: string }) => Promise<void>
  getCompletedIntent: (paymentId: string) => CompletedIntent | undefined
  refreshIntents: () => Promise<void>
}

export function useCompletedIntents(merchantId?: string): UseCompletedIntentsReturn {
  const [completedIntents, setCompletedIntents] = useState<CompletedIntent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentAccount = useCurrentAccount()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()
  const { getLockedObjectsId, getCoinInstances } = usePaymentClient()

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

  const getWithdrawalData = async (intent: Intent, accountId: string) => {
    if (!currentAccount?.address) {
      throw new Error('No wallet connected')
    }

    try {
      // Get the transfer object from intent args
      const transfers = (intent.args as any)?.transfers || []
      const transfer = transfers[0]
      
      if (!transfer?.objectId || !transfer?.recipient) {
        console.warn('No transfer object found in withdrawal intent')
        return null
      }

      // Get locked objects to verify this is a valid withdrawal
      const lockedObjects = await getLockedObjectsId(currentAccount.address, accountId)
      
      if (!lockedObjects.includes(transfer.objectId)) {
        console.warn('Transfer object not found in locked objects')
        return null
      }

      // Get USDC coin instances to find the amount
      const coinInstances = await getCoinInstances(currentAccount.address, accountId, "usdc::USDC")
      
      // Find the matching coin instance
      const coinInstance = coinInstances.find(
        instance => instance.objectId === transfer.objectId
      )

      if (!coinInstance) {
        console.warn('Coin instance not found for withdrawal')
        return null
      }

      return {
        amount: coinInstance.amount,
        coinType: 'usdc::USDC',
        recipient: transfer.recipient
      }
    } catch (error) {
      console.error('Error getting withdrawal data:', error)
      return null
    }
  }

  const addCompletedIntent = useCallback(async (intent: Intent, paymentId: string, txHash?: string, displayData?: { amount: string, coinType: string, recipient?: string }) => {
    if (!currentAccount?.address) {
      throw new Error('No wallet connected')
    }

    try {
      const authParams = await createAuthParams('save-intent')

      // Determine if this is a withdrawal based on intent type
      const isWithdrawal = intent.fields?.type_?.includes('WithdrawAndTransferIntent')
      
      let intentData
      
      if (isWithdrawal) {
        // For withdrawals, get data using the withdrawal-specific logic
        const withdrawalData = await getWithdrawalData(intent, intent.account || merchantId || '')
        
        if (!withdrawalData) {
          console.warn('Could not extract withdrawal data, using fallback values')
        }
        
        intentData = {
          intentId: paymentId,
          walletAddress: currentAccount.address,
          merchantId: intent.account || merchantId || '',
          type: 'withdrawal',
          amount: withdrawalData?.amount || displayData?.amount || '0',
          coinType: withdrawalData?.coinType || displayData?.coinType || 'usdc::USDC',
          description: intent.fields?.description || '',
          sender: intent.fields?.creator || currentAccount.address,
          recipient: withdrawalData?.recipient || displayData?.recipient || '',
          tipAmount: '0', // Withdrawals don't have tips
          txHash,
        }
      } else {
        // For regular payments, use the existing logic
        intentData = {
          intentId: paymentId,
          walletAddress: currentAccount.address,
          merchantId: intent.account || merchantId || '',
          type: 'payment',
          amount: (intent.args as any)?.amount?.toString() || displayData?.amount || '0',
          coinType: (intent.args as any)?.coinType || displayData?.coinType || '',
          description: intent.fields?.description || '',
          sender: intent.fields?.creator || currentAccount.address,
          recipient: intent.account,
          tipAmount: (intent.args as any)?.tip?.toString() || '0',
          txHash,
        }
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
  }, [currentAccount?.address, merchantId, createAuthParams, fetchCompletedIntents, getLockedObjectsId, getCoinInstances])

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