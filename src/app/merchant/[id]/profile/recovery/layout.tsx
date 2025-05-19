'use client';

import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function RecoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="container mx-auto max-w-md px-4">
      <div className="py-4 flex items-center">
        <button
          onClick={() => router.back()}
          className="mr-2 p-1 rounded-full hover:bg-gray-800 transition"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-xl font-semibold text-white">Account Recovery</h1>
      </div>
      {children}
    </div>
  );
} 