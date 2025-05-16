"use client";

import { QrCode } from "lucide-react";

export function QrCodeButton() {
  return (
    <div className="my-10">
      <p className="text-center text-gray-400 mb-4">Or flash QR Code</p>
      <div className="flex justify-center">
        <button className="w-16 h-16 flex items-center justify-center rounded-lg bg-[#2A2A2F] border border-[#5E6164] text-white">
          <QrCode className="size-8" />
        </button>
      </div>
    </div>
  );
} 