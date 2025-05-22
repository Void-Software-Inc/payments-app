"use client"

import { useState, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Metadata } from "next"

// This page is intentionally public and does not require authentication
// It's designed to be accessible when scanning a QR code without wallet connection
export const metadata: Metadata = {
  title: 'Copy Payment ID | Drift',
  description: 'Copy a payment ID to your clipboard',
}

export default function CopyPage({ params }: { params: { slug: string[] } }) {
  const [copied, setCopied] = useState(false)
  const [idValue, setIdValue] = useState("")
  
  // Extract merchant and payment IDs from the URL
  useEffect(() => {
    if (params.slug && params.slug.length >= 2) {
      const merchantId = params.slug[0]
      const paymentId = params.slug[1]
      const fullValue = `${merchantId}/${paymentId}`
      setIdValue(fullValue)
    }
  }, [params.slug])
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(idValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = idValue
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (err) {
        console.error("Failed to copy:", err)
      }
      
      document.body.removeChild(textArea)
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1D1D20] p-4">
      <div className="bg-[#2A2A2F] rounded-lg p-6 w-full max-w-md">
        <h1 className="text-white text-xl font-semibold mb-4">
          Copy Payment ID
        </h1>
        
        <p className="text-gray-400 text-sm mb-6">
          Tap the button below to copy the payment ID to your clipboard:
        </p>
        
        <div className="bg-[#3A3A3F] rounded p-3 font-mono text-sm text-white mb-4 overflow-x-auto">
          {idValue}
        </div>
        
        <Button
          onClick={copyToClipboard}
          className="w-full h-12 rounded-md bg-[#78BCDB] hover:bg-[#67ABC9] text-white"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>
        
        {copied && (
          <p className="text-green-500 text-center mt-4 text-sm">
            Payment ID copied to clipboard!
          </p>
        )}
      </div>
    </div>
  )
} 