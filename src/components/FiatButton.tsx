"use client";

import { CircleDollarSign } from "lucide-react";

export function FiatButton() {
  return (
    <div className="my-10">
      <p className="text-center text-gray-400 mb-4">Or Buy with Fiat</p>
      <div className="flex justify-center">
        <button className="w-16 h-16 flex items-center justify-center rounded-lg bg-[#2A2A2F] border border-gray-700 text-white">
          <CircleDollarSign className="size-7" />
        </button>
      </div>
    </div>
  );
} 