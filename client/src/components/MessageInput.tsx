import { useState, useEffect, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, setTyping } = useChat();
  const typingTimeoutRef = useRef<number | null>(null);
  
  // Handle typing indicator
  useEffect(() => {
    // Clear previous timeout
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    // If message is empty and was typing, set typing to false
    if (message === "" && isTyping) {
      setIsTyping(false);
      setTyping(false);
    } 
    // If message is not empty and wasn't typing, set typing to true
    else if (message !== "" && !isTyping) {
      setIsTyping(true);
      setTyping(true);
    }
    
    // Set timeout to reset typing status after 3 seconds of inactivity
    if (message !== "") {
      typingTimeoutRef.current = window.setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          setTyping(false);
        }
      }, 3000);
    }
    
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, setTyping]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim()) {
      try {
        await sendMessage(message);
        setMessage("");
        setIsTyping(false);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };
  
  return (
    <div className="bg-white border-t border-gray-200 p-3">
      <form onSubmit={handleSendMessage} className="flex items-center">
        <button 
          type="button" 
          className="text-gray-500 hover:text-gray-700 p-2"
        >
          <i className="ri-emotion-line text-xl"></i>
        </button>
        <button 
          type="button"
          className="text-gray-500 hover:text-gray-700 p-2"
        >
          <i className="ri-attachment-2 text-xl"></i>
        </button>
        <div className="flex-1 mx-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <Button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full transition-colors"
        >
          <i className="ri-send-plane-fill text-xl"></i>
        </Button>
      </form>
    </div>
  );
}
