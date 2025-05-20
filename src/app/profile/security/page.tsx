"use client";

import React from "react";
import { DependencyStatus } from "./components/DependencyStatus";

export default function SecurityPage() {
  return (
    <div className="w-dvw h-dvh container mx-auto px-4 max-w-md pt-6 overflow-y-auto">
        <div className="mb-6 flex justify-center items-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Security Settings</h1>
        </div>
      
      <DependencyStatus />
    </div>
  );
} 