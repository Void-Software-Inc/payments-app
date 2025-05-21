"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, AlertCircle } from "lucide-react"
import { truncateMiddle } from "@/utils/formatters"

interface WithdrawStatusProps {
  isOwner: boolean
  account: any
}

export function WithdrawStatus({ isOwner, account }: WithdrawStatusProps) {
  // Get backup addresses if available
  const getBackupAddresses = () => {
    if (!account?.members || account.members.length <= 1) return [];
    
    // Get all members except the first one (owner)
    return account.members.slice(1).map((member: any) => {
      if (typeof member === 'string') return member;
      return member?.address || member?.id || 'Unknown';
    });
  };

  const backupAddresses = getBackupAddresses();

  if (isOwner) {
    return (
      <Card className="bg-blue-900/50 border border-blue-500/50 shadow-lg w-full mb-4">
        <CardContent className="pt-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-1" />
          <div>
            <p className="text-blue-200">
              As the owner, you can initiate a withdrawal from this account.
              After initiation, you will need to confirm the transaction with one of your backup accounts.
            </p>
            {backupAddresses.length > 0 && (
              <div className="mt-2">
                <p className="text-blue-200/70 text-sm">Backup accounts:</p>
                <ul className="list-disc list-inside mt-1">
                  {backupAddresses.map((address: string, index: number) => (
                    <li key={index} className="text-blue-200/70 text-sm ml-2">
                      {truncateMiddle(address)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/50 border border-gray-700 shadow-lg w-full mb-4">
      <CardContent className="pt-6 flex items-center">
        <AlertTriangle className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
        <div>
          <p className="text-gray-300">
            You don't have permission to initiate withdrawals from this account. 
            If you are a backup account, you can complete withdrawals initiated by the owner.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 