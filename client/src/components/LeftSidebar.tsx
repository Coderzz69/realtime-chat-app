import { useState, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Conversation, UserProfile } from "@/types";
import { Avatar } from "./Avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { SearchIcon, PlusIcon } from "lucide-react";

export function LeftSidebar() {
  const { state, setCurrentConversation } = useChat();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'messages' | 'groups' | 'contacts'>('messages');
  
  const filteredConversations = state.conversations.filter(conversation => {
    // For group chats, search in the name
    if (conversation.isGroup && conversation.name) {
      return conversation.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // For direct messages, search in participant names
    return conversation.participants.some(participant => 
      participant.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.isGroup && conversation.name) {
      return conversation.name;
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(
      participant => participant.id !== user?.uid
    );
    
    return otherParticipant?.displayName || 'Unknown User';
  };
  
  const getLastMessageTime = (timestamp: Date | undefined): string => {
    if (!timestamp) return '';
    
    if (isToday(timestamp)) {
      return format(timestamp, 'h:mm a');
    } else if (isYesterday(timestamp)) {
      return 'Yesterday';
    } else {
      return format(timestamp, 'MMM d');
    }
  };
  
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Conversation Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'messages' 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('messages')}
        >
          <i className="ri-chat-3-line text-lg md:hidden"></i>
          <span className="hidden md:inline">Messages</span>
        </button>
        <button 
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'groups' 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('groups')}
        >
          <i className="ri-group-line text-lg md:hidden"></i>
          <span className="hidden md:inline">Groups</span>
        </button>
        <button 
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'contacts' 
              ? 'text-primary-600 border-b-2 border-primary-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          <i className="ri-contacts-line text-lg md:hidden"></i>
          <span className="hidden md:inline">Contacts</span>
        </button>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:block">
          Recent Chats
        </h3>
        
        {filteredConversations.map(conversation => {
          const isActive = state.currentConversation?.id === conversation.id;
          const conversationName = getConversationName(conversation);
          const otherParticipant = conversation.participants.find(
            participant => participant.id !== user?.uid
          );
          
          return (
            <div 
              key={conversation.id}
              className={`flex items-center px-3 py-3 cursor-pointer ${
                isActive ? 'bg-primary-50 border-l-4 border-primary-600' : 'hover:bg-gray-50'
              }`}
              onClick={() => setCurrentConversation(conversation)}
            >
              {conversation.isGroup ? (
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {getInitials(conversationName)}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                </div>
              ) : (
                <Avatar 
                  user={otherParticipant || {}} 
                  showStatus={true}
                />
              )}
              
              <div className="ml-3 hidden md:block overflow-hidden flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conversationName}
                  </p>
                  <span className="text-xs text-gray-500">
                    {conversation.lastMessage?.timestamp && 
                      getLastMessageTime(new Date(conversation.lastMessage.timestamp))}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate">
                    {conversation.lastMessage?.content && (
                      conversation.lastMessage.senderId === user?.uid
                        ? `You: ${conversation.lastMessage.content}`
                        : conversation.lastMessage.content
                    )}
                  </p>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* New Chat Button */}
      <div className="p-3 border-t border-gray-200">
        <Button
          className="w-full flex items-center justify-center md:justify-start bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-0 md:mr-2" />
          <span className="hidden md:inline">New Conversation</span>
        </Button>
      </div>
    </div>
  );
}
