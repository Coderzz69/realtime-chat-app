import { useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, UserMinus, FileText, Download } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle";
import { format } from "date-fns";

export default function RightSidebar() {
  const { activeConversation } = useChat();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  
  // Get the first user in the conversation (for direct messages)
  const otherUser = activeConversation?.users?.[0];
  
  if (!activeConversation) {
    return null;
  }

  return (
    <div className="hidden md:flex w-72 bg-white border-l border-gray-200 flex-col">
      {/* User Profile */}
      <div className="p-4 border-b border-gray-200 text-center">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <Avatar className="w-full h-full">
            <AvatarImage src={otherUser?.photoURL} alt={otherUser?.username} />
            <AvatarFallback>{otherUser?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-4 h-4 ${
            otherUser?.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'
          } rounded-full border-2 border-white`}></div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {activeConversation.isGroup ? activeConversation.name : otherUser?.username || "Unknown User"}
        </h3>
        <p className="text-sm text-gray-600">
          {otherUser?.title || "User"}
        </p>
        <div className="flex justify-center mt-3 space-x-3">
          <Button size="sm" className="flex items-center">
            <UserPlus className="mr-1 h-4 w-4" />
            Add Friend
          </Button>
          <Button size="sm" variant="outline" className="flex items-center">
            <UserMinus className="mr-1 h-4 w-4" />
            Block
          </Button>
        </div>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">About</h4>
        <p className="text-sm text-gray-600">
          {otherUser?.bio || "No bio available."}
        </p>
      </div>
      
      {/* Shared Media */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Shared Media</h4>
          <a href="#" className="text-xs text-primary hover:text-primary/80">See All</a>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* We'd dynamically load shared media from Firestore */}
          <div className="rounded-md bg-gray-200 h-16 flex items-center justify-center text-gray-500 text-xs">
            No media
          </div>
          <div className="rounded-md bg-gray-200 h-16 flex items-center justify-center text-gray-500 text-xs">
            No media
          </div>
          <div className="rounded-md bg-gray-200 h-16 flex items-center justify-center text-gray-500 text-xs">
            No media
          </div>
        </div>
      </div>
      
      {/* Shared Files */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Shared Files</h4>
          <a href="#" className="text-xs text-primary hover:text-primary/80">See All</a>
        </div>
        <div className="space-y-2">
          <div className="flex items-center p-2 bg-gray-50 rounded-md">
            <FileText className="text-gray-500 mr-2 h-5 w-5" />
            <div className="overflow-hidden flex-1">
              <p className="text-sm text-gray-900 truncate">example_file.pdf</p>
              <p className="text-xs text-gray-500">2.3 MB • {format(new Date(), 'MMM d')}</p>
            </div>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Settings */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Chat Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Notifications</span>
              <ToggleSwitch 
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                aria-label="Toggle notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Message Preview</span>
              <ToggleSwitch 
                checked={previewEnabled}
                onCheckedChange={setPreviewEnabled}
                aria-label="Toggle message preview"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
