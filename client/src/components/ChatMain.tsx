import { useState, useRef, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Video, Info, MoreHorizontal, Smile, Paperclip, Send } from "lucide-react";
import { format } from "date-fns";

export default function ChatMain() {
  const { activeConversation, messages, sendMessage, setTypingStatus, typingUsers } = useChat();
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const otherUser = activeConversation?.users?.[0];
  const typing = typingUsers[otherUser?.id] || false;

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Set typing status
    if (e.target.value.length > 0) {
      setTypingStatus(true);
    } else {
      setTypingStatus(false);
    }
  };

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "h:mm a");
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: any[] } = {};
    
    messages.forEach(message => {
      if (!message.createdAt) return;
      
      const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
      const dateKey = format(date, "yyyy-MM-dd");
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, msgs]) => {
      // Format the date label
      const messageDate = new Date(date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateLabel;
      if (format(messageDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
        dateLabel = "Today";
      } else if (format(messageDate, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
        dateLabel = "Yesterday";
      } else {
        dateLabel = format(messageDate, "MMMM d, yyyy");
      }
      
      return { dateLabel, messages: msgs };
    });
  };

  const groupedMessages = groupMessagesByDate();

  if (!activeConversation) {
    return (
      <div className="flex flex-col flex-1 bg-gray-50 items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-semibold text-gray-700">Select a conversation</h2>
          <p className="text-gray-500 mt-2">Choose a conversation from the sidebar or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center">
          <div className="relative flex-shrink-0 mr-3">
            <Avatar>
              <AvatarImage src={otherUser?.photoURL} alt={otherUser?.username} />
              <AvatarFallback>{otherUser?.username?.charAt(0)?.toUpperCase() || "G"}</AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-3 h-3 ${
              otherUser?.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'
            } rounded-full border-2 border-white`}></div>
          </div>
          <div>
            <h2 className="text-md font-semibold text-gray-900">
              {activeConversation.isGroup ? activeConversation.name : otherUser?.username || "Unknown User"}
            </h2>
            <div className="flex items-center">
              <span className={`text-xs ${otherUser?.status === 'online' ? 'text-emerald-600' : 'text-gray-500'}`}>
                {otherUser?.status === 'online' ? 'Online' : 'Offline'}
              </span>
              <span className="mx-1 text-gray-300">•</span>
              <span className="text-xs text-gray-500">
                {otherUser?.lastSeen ? `Last seen ${formatMessageDate(otherUser.lastSeen)}` : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" title="Voice Call">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" title="Video Call">
            <Video className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-gray-700 md:hidden" 
            title="Info"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" title="More">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="flex justify-center mb-4">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {group.dateLabel}
              </span>
            </div>
            
            {group.messages.map((message, index) => {
              const isSender = message.senderId === currentUser?.uid;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex mb-4 ${isSender ? 'justify-end' : ''} animate-fade-in`}
                >
                  {!isSender && (
                    <Avatar className="w-8 h-8 mr-2 self-end">
                      <AvatarImage src={otherUser?.photoURL} alt={otherUser?.username} />
                      <AvatarFallback>{otherUser?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="max-w-md">
                    <div className={`${
                      isSender ? 'bg-primary text-white' : 'bg-white text-gray-800'
                    } rounded-lg p-3 shadow-sm`}>
                      {message.contentType === 'text' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : message.contentType === 'image' ? (
                        <div>
                          <p className="text-sm mb-2">{message.content}</p>
                          <img src={message.mediaUrl} alt="Shared" className="rounded-md w-full h-48 object-cover" />
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                    <div className={`flex items-center mt-1 ${isSender ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-500 mr-1">
                        {formatMessageDate(message.createdAt)}
                      </span>
                      {isSender && (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="text-primary"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {/* Typing Indicator */}
        {typing && (
          <div className="flex mb-4 animate-fade-in">
            <Avatar className="w-8 h-8 mr-2 self-end">
              <AvatarImage src={otherUser?.photoURL} alt={otherUser?.username} />
              <AvatarFallback>{otherUser?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      {/* Message Input Area */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <Smile className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-gray-500" />
          </Button>
          <Input
            type="text"
            placeholder="Type a message..."
            className="flex-1 mx-2 rounded-full"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
          />
          <Button 
            variant="default" 
            size="icon" 
            className="rounded-full" 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
