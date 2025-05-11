import { User } from "lucide-react";

interface ProfileAvatarProps {
  avatar: string | null | undefined;
}

export function ProfileAvatar({ avatar }: ProfileAvatarProps) {
  return (
    <div className="flex justify-center mb-4 ">
      {avatar ? (
        <img 
          src={avatar} 
          alt="Profile" 
          className="h-32 w-32 rounded-md object-cover"
        />
      ) : (
        <div className="h-32 w-32 rounded-md bg-gray-800 flex items-center justify-center">
          <User className="h-16 w-16 text-gray-400" />
        </div>
      )}
    </div>
  );
} 