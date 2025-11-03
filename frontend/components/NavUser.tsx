import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/frontend/components/ui/avatar";
import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/frontend/components/ui/sidebar";
import { CircleUserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { useUserStore } from "@/frontend/stores/UserStore";
import { apiCall } from "@/utils/api-call";
import { toast } from "sonner";

export function NavUser() {
  const { user } = useUserStore();
  const { firstName, lastName, phoneNumber } = user || {};
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  // In your logout handler (wherever you have it)
  const handleLogout = async () => {
    try {
      // Call logout API
      await apiCall("/api/logout", "POST");
      useUserStore.getState().logout();
      navigate("/chat");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      useUserStore.getState().logout();
      navigate("/chat");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage alt={firstName} />
                <AvatarFallback className="rounded-lg">
                  <CircleUserRound size={20} />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {firstName} {lastName}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {phoneNumber}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage alt={firstName} />
                  <AvatarFallback className="rounded-lg">
                    <CircleUserRound size={24} />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {firstName} {lastName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {phoneNumber}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/billing")}>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
