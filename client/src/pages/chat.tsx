import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import LeftSidebar from "@/components/LeftSidebar";
import ChatMain from "@/components/ChatMain";
import RightSidebar from "@/components/RightSidebar";
import { Moon, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Chat() {
  const [, navigate] = useLocation();
  const { currentUser, userProfile, logout, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, isLoading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-[500px] w-[400px] rounded-md" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <ChatProvider>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary mr-2">FireChat</h1>
            <Badge variant="secondary" className="hidden md:inline-block">Beta</Badge>
          </div>
          
          <div className="relative flex items-center">
            <Button variant="ghost" size="icon" className="mr-4">
              <Moon className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="mr-4 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">2</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer">
                  <div className="relative h-8 w-8 rounded-full overflow-hidden mr-2">
                    <Avatar>
                      <AvatarImage src={userProfile?.photoURL || ""} alt={userProfile?.username || "User"} />
                      <AvatarFallback>{userProfile?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="font-medium text-sm text-gray-700 hidden md:block">
                    {userProfile?.username || currentUser.displayName || currentUser.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <ChatMain />
          <RightSidebar />
        </div>
      </div>
    </ChatProvider>
  );
}
