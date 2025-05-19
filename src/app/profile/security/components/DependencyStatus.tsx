"use client";

import React from "react";
import { DepStatus } from "@/hooks/usePaymentClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DependencyStatusProps {
  depsStatus: DepStatus[];
  loading: boolean;
  updating: boolean;
  onUpdate: () => void;
}

export function DependencyStatus({
  depsStatus,
  loading,
  updating,
  onUpdate,
}: DependencyStatusProps) {
  // Check if there are any dependencies that need updates
  const hasUpdates = depsStatus.some(
    (dep) => dep.latestVersion > dep.currentVersion
  );

  return (
    <Card className="mb-16 bg-[#2A2A2F] border-none">
      <CardHeader>
        <CardTitle className="text-white text-xl">Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading dependencies status...</p>
        ) : depsStatus.length === 0 ? (
          <p>No dependencies found.</p>
        ) : (
          <>
            <div className="mb-4 text-white">
              <p>
                {hasUpdates
                  ? "Updates are available for your payment client dependencies."
                  : "All dependencies are up to date."}
              </p>
            </div>
            
            <div className="space-y-4 text-white">
              {depsStatus.map((dep) => (
                <div
                  key={dep.name}
                  className=" p-4 rounded-md bg-[#343438]"
                >
                  <h3 className="font-medium">{dep.name}</h3>
                  <p className="text-sm text-gray-400">
                    Current: v{dep.currentVersion} ({dep.currentAddr.slice(0, 8)}...
                    {dep.currentAddr.slice(-4)})
                  </p>
                  {dep.latestVersion > dep.currentVersion && (
                    <p className="text-sm text-green-500">
                      Latest: v{dep.latestVersion} ({dep.latestAddr.slice(0, 8)}...
                      {dep.latestAddr.slice(-4)})
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {hasUpdates && (
              <Button
                className="mt-4 w-full h-12 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-md"
                onClick={onUpdate}
                disabled={updating}
              >
                {updating ? "Updating..." : "Update Dependencies"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 