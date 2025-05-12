import { Copy } from "lucide-react";
import { useState } from "react";

interface ProfileInfoProps {
  username: string | null | undefined;
  address: string;
}

export function ProfileInfo({ username, address }: ProfileInfoProps) {
  const [copied, setCopied] = useState(false);
  
  const displayName = username || "User";
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl text-white font-medium mb-1">{displayName}</h2>
      <div className="flex items-center text-[#7AC0E0]">
        <span className="text-sm">{shortAddress}</span>
        <button 
          onClick={copyToClipboard}
          className="ml-2 p-1 rounded-full hover:bg-gray-800 text-[#7AC0E0]"
        >
          <Copy className="h-4 w-4" />
          {copied && (
            <span className="absolute bg-gray-800 text-white text-xs px-2 py-1 rounded -mt-8 ml-2">
              Copied!
            </span>
          )}
        </button>
      </div>
    </div>
  );
} 