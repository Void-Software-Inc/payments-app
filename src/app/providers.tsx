'use client';

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { StrictMode } from "react";

const Provider = dynamic(() => import("@/components/Provider"), {
  ssr: false,
});


export function Providers({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <Provider>{children}</Provider>
    </StrictMode>
  );
}