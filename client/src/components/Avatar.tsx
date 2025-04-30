import { UserProfile } from "@/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  user: Partial<UserProfile>;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  className?: string;
}

export function Avatar({ user, size = "md", showStatus = false, className }: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
  };

  const statusSize = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
  };

  const getInitials = () => {
    if (!user.displayName) return "U";
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={`${user.displayName || "User"} avatar`}
          className={cn(
            sizeClasses[size],
            "rounded-full object-cover"
          )}
        />
      ) : (
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-primary-100 flex items-center justify-center"
          )}
        >
          <span className="text-primary-700 font-semibold text-sm">
            {getInitials()}
          </span>
        </div>
      )}
      
      {showStatus && (
        <div
          className={cn(
            "online-indicator",
            statusSize[size],
            user.status === "online" ? "online" : "offline"
          )}
        ></div>
      )}
    </div>
  );
}
