import { NextRequest, NextResponse } from 'next/server'
import { getCompletedIntentById } from '@/services/intents'
import { verifyWalletSignature, isMessageValid, extractWalletFromMessage } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const message = searchParams.get('message')
    const signature = searchParams.get('signature')
    const publicKey = searchParams.get('publicKey')

    if (!walletAddress || !message || !signature || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required authentication parameters' },
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

    // Get completed intent by ID
    const intent = await getCompletedIntentById(params.id, walletAddress)

    if (!intent) {
      return NextResponse.json(
        { error: 'Intent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ intent })
  } catch (error) {
    console.error('Error fetching completed intent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 