import { useState, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Users, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { searchUsers } from "@/lib/firebase";

export default function LeftSidebar() {
  const { conversations, activeConversation, setActiveConversation, createConversation } = useChat();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const [newChatOpen, setNewChatOpen] = useState(false);

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchQuery);
          // Filter out current user
          const filteredResults = results.filter(user => user.uid !== currentUser?.uid);
          setSearchResults(filteredResults);
        } catch (error) {
          console.error("Error searching users:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, currentUser]);

  const handleStartConversation = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(conv => 
        !conv.isGroup && 
        conv.participants.includes(userId) && 
        conv.participants.includes(currentUser.uid)
      );
      
      if (existingConv) {
        setActiveConversation(existingConv);
      } else {
        const conversationId = await createConversation([userId, currentUser.uid]);
        // The chat context should automatically update with the new conversation
        // we just need to find it and set it as active
        const newConv = conversations.find(conv => conv.id === conversationId);
        if (newConv) {
          setActiveConversation(newConv);
        }
      }
      
      setNewChatOpen(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if the date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return format(date, "h:mm a");
    }
    
    // Check if the date is within the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (date > oneWeekAgo) {
      return format(date, "EEE");
    }
    
    return format(date, "MMM d");
  };

  return (
    <div className="w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="relative">
          <Input 
            type="text" 
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Conversation Tabs */}
      <Tabs defaultValue="messages" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
          <TabsTrigger value="messages" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <MessageSquare className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Users className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <UserPlus className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Contacts</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:block">
          Recent Chats
        </h3>
        
        {conversations.map((conversation) => {
          // For direct messages, get the other user
          const otherUser = conversation.users?.[0];
          const isActive = activeConversation?.id === conversation.id;
          const hasUnread = conversation.unreadCount > 0;
          
          return (
            <div 
              key={conversation.id}
              className={`flex items-center px-3 py-3 cursor-pointer ${
                isActive ? 'bg-primary-50 border-l-4 border-primary' : 'hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              onClick={() => setActiveConversation(conversation)}
            >
              <div className="relative flex-shrink-0">
                {conversation.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {conversation.name ? conversation.name.charAt(0).toUpperCase() : "G"}
                    </span>
                  </div>
                ) : (
                  <Avatar>
                    <AvatarImage src={otherUser?.photoURL} alt={otherUser?.username} />
                    <AvatarFallback>{otherUser?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`absolute bottom-0 right-0 w-3 h-3 ${
                  otherUser?.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'
                } rounded-full border-2 border-white`}></div>
              </div>
              <div className="ml-3 hidden md:block overflow-hidden flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conversation.isGroup ? conversation.name : otherUser?.username || "Unknown User"}
                  </p>
                  <span className="text-xs text-gray-500">
                    {conversation.lastMessage?.createdAt && formatTimestamp(conversation.lastMessage.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate">
                    {conversation.lastMessage?.content || "No messages yet"}
                  </p>
                  {hasUnread && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </ScrollArea>
      
      {/* New Chat Button */}
      <div className="p-3 border-t border-gray-200">
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogTrigger asChild>
            <Button className="w-full flex items-center justify-center md:justify-start">
              <MessageSquare className="h-4 w-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">New Conversation</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a New Conversation</DialogTitle>
            </DialogHeader>
            <div className="my-4">
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Search for users..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-4">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchQuery.length >= 2 ? "No users found" : "Type at least 2 characters to search"}
                </div>
              ) : (
                searchResults.map((user) => (
                  <div 
                    key={user.uid}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => handleStartConversation(user.uid)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.photoURL} alt={user.username} />
                      <AvatarFallback>{user.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
