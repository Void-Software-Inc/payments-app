"use client"

import React from "react"

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple layout without background color
  return (
    <div className="w-full min-h-screen">
      {children}
    </div>
  )
} 