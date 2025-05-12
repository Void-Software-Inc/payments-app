import { QrCode } from "lucide-react";

export function ProfileHeader() {
  return (
    <div className="flex justify-between items-center w-full mb-6 mt-3">
      <div className="w-8" /> {/* Spacer for balance */}
      <h1 className="text-2xl font-bold text-white">My Profile</h1>
      <button className="p-2 rounded-full hover:bg-gray-800">
        <QrCode className="h-6 w-6 text-white" />
      </button>
    </div>
  );
} 