"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import { truncateMiddle } from "@/utils/formatters"

interface WithdrawStatusProps {
  isOwner: boolean
  isBackup: boolean
  pendingWithdraws: Record<string, any>
  account: any
}

export function WithdrawStatus({ isOwner, isBackup, pendingWithdraws, account }: WithdrawStatusProps) {
  const hasPendingWithdraws = Object.keys(pendingWithdraws).length > 0
  
  // Get backup address if available, handle potential complex objects
  const getMemberAddress = (member: any): string => {
    if (typeof member === 'string') return member
    return member?.id || member?.address || 'Unknown'
  }
  
  // Convert members to appropriate format
  const memberAddresses = account?.members?.map(getMemberAddress) || []
  const backupAddress = memberAddresses.length > 1 ? memberAddresses[1] : null
  const ownerAddress = memberAddresses.length > 0 ? memberAddresses[0] : null
  
  // Show status banner for pending withdrawals
  if (hasPendingWithdraws) {
    if (isOwner) {
      return (
        <Card className="bg-amber-900/50 border border-amber-500/50 shadow-lg w-full mb-4">
          <CardContent className="pt-6 flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
            <div>
              <p className="text-amber-200">
                Withdrawal initiated. Backup account must confirm to complete the transaction.
              </p>
              {backupAddress && (
                <p className="text-amber-200/70 text-sm mt-1">
                  Backup address: {truncateMiddle(backupAddress)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }
    
    if (isBackup) {
      return (
        <Card className="bg-green-900/50 border border-green-500/50 shadow-lg w-full mb-4">
          <CardContent className="pt-6 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <div>
              <p className="text-green-200">
                You can complete the pending withdrawal as the backup account.
              </p>
              {ownerAddress && (
                <p className="text-green-200/70 text-sm mt-1">
                  Initiated by: {truncateMiddle(ownerAddress)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }
    
    // For other users viewing the account
    return (
      <Card className="bg-blue-900/50 border border-blue-500/50 shadow-lg w-full mb-4">
        <CardContent className="pt-6 flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div>
            <p className="text-blue-200">
              This account has pending withdrawals awaiting confirmation from the backup account.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // No pending withdrawals
  if (isOwner) {
    return (
      <Card className="bg-blue-900/50 border border-blue-500/50 shadow-lg w-full mb-4">
        <CardContent className="pt-6 flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div>
            <p className="text-blue-200">
              As the owner, you can initiate a withdrawal from this account.
            </p>
            {backupAddress && (
              <p className="text-blue-200/70 text-sm mt-1">
                After initiation, your backup account ({truncateMiddle(backupAddress)}) 
                will need to confirm the transaction.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (isBackup) {
    return (
      <Card className="bg-gray-800/50 border border-gray-700 shadow-lg w-full mb-4">
        <CardContent className="pt-6 flex items-center">
          <AlertCircle className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
          <div>
            <p className="text-gray-300">
              You are the backup account. There are no pending withdrawals to confirm.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Default no permission view
  return (
    <Card className="bg-gray-800/50 border border-gray-700 shadow-lg w-full mb-4">
      <CardContent className="pt-6 flex items-center">
        <AlertTriangle className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
        <div>
          <p className="text-gray-300">
            You don't have permission to withdraw funds from this account.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 