'use client';

import { useParams } from 'next/navigation';
import RecoveryAddressForm from './components/RecoveryAddressForm';

export default function RecoveryPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="py-4">
      <p className="text-gray-400 text-sm mb-6">
        Set up a recovery address that can help you regain access to your account if you lose your keys.
      </p>
      <RecoveryAddressForm accountId={id} />
    </div>
  );
} 