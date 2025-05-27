import { NextRequest, NextResponse } from 'next/server'
import { createCompletedIntent, getCompletedIntents, CreateIntentData } from '@/services/intents'
import { verifyWalletSignature, isMessageValid, extractWalletFromMessage } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const merchantId = searchParams.get('merchantId')
    const message = searchParams.get('message')
    const signature = searchParams.get('signature')
    const publicKey = searchParams.get('publicKey')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // If authentication parameters are provided, verify them
    if (message && signature && publicKey) {
      // Verify message is recent and valid
      if (!isMessageValid(message)) {
        return NextResponse.json(
          { error: 'Message expired or invalid' },
          { status: 401 }
        )
      }

      // Verify wallet address matches message
      const messageWallet = extractWalletFromMessage(message)
      if (messageWallet !== walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address mismatch' },
          { status: 401 }
        )
      }

      // Verify signature
      const isValidSignature = await verifyWalletSignature(message, signature, publicKey)
      if (!isValidSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }
    // If no authentication parameters, allow read access for the wallet owner

    // Get completed intents
    const intents = await getCompletedIntents(walletAddress, merchantId || undefined)

    return NextResponse.json({ intents })
  } catch (error) {
    console.error('Error fetching completed intents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      intentData, 
      walletAddress, 
      message, 
      signature, 
      publicKey 
    }: {
      intentData: CreateIntentData
      walletAddress: string
      message: string
      signature: string
      publicKey: string
    } = body

    if (!walletAddress || !message || !signature || !publicKey || !intentData) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify message is recent and valid
    if (!isMessageValid(message)) {
      return NextResponse.json(
        { error: 'Message expired or invalid' },
        { status: 401 }
      )
    }

    // Verify wallet address matches message and intent data
    const messageWallet = extractWalletFromMessage(message)
    if (messageWallet !== walletAddress || intentData.walletAddress !== walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address mismatch' },
        { status: 401 }
      )
    }

    // Verify signature
    const isValidSignature = await verifyWalletSignature(message, signature, publicKey)
    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Create completed intent
    const intent = await createCompletedIntent(intentData)

    return NextResponse.json({ intent }, { status: 201 })
  } catch (error) {
    console.error('Error creating completed intent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 