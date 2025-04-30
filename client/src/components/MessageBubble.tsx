import { Message, UserProfile } from "@/types";
import { useState, useEffect } from "react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  sender: UserProfile | null;
  isSelf: boolean;
  showAvatar?: boolean;
}

export function MessageBubble({ message, sender, isSelf, showAvatar = true }: MessageBubbleProps) {
  const [timeFormatted, setTimeFormatted] = useState<string>("");
  
  useEffect(() => {
    if (message.timestamp) {
      setTimeFormatted(format(
        typeof message.timestamp === 'string' 
          ? new Date(message.timestamp) 
          : message.timestamp, 
        "h:mm a"
      ));
    }
  }, [message.timestamp]);
  
  return (
    <div className={cn(
      "flex mb-4 animate-fade-in message-bubble-transition",
      isSelf ? "justify-end" : ""
    )}>
      {!isSelf && showAvatar && (
        <Avatar 
          user={sender || {}} 
          size="sm" 
          className="mr-2 self-end"
        />
      )}
      
      <div className="max-w-md">
        <div className={cn(
          "rounded-lg p-3 shadow-sm",
          isSelf ? "bg-primary-600" : "bg-white"
        )}>
          <p className={cn(
            "text-sm",
            isSelf ? "text-white" : "text-gray-800"
          )}>
            {message.content}
          </p>
        </div>
        
        <div className={cn(
          "flex items-center mt-1",
          isSelf ? "justify-end" : ""
        )}>
          <span className="text-xs text-gray-500 mr-1">{timeFormatted}</span>
          {isSelf && <i className="ri-check-double-line text-xs text-primary-600"></i>}
        </div>
      </div>
    </div>
  );
}
