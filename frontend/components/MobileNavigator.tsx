import { memo } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  MessageSquare,
  User,
  CreditCard,
  X,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import AuthForm from "./AuthForm";
import { useUserStore } from "../stores/UserStore";

interface MobileNavigatorProps {
  isVisible: boolean;
  onClose: () => void;
}

function PureMobileNavigator({ isVisible, onClose }: MobileNavigatorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useUserStore();
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const navItems = [
    { path: "/chat", label: "Chat", icon: MessageSquare },
    { path: "/billing", label: "Pricing", icon: CreditCard },
    { path: "/account", label: "Account", icon: User },
    ...(isAdmin
      ? [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop - only visible on small screens */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - hidden on md and larger screens */}
      <aside
        className={`fixed right-0 top-0 h-full w-80 bg-background border-l z-50 transform transition-transform duration-300 ease-in-out sm:hidden ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <img
              src="/ET.png"
              alt="logo"
              className="h-8 w-auto object-contain"
            />
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Close navigator"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer with auth */}
          <div className="p-4 border-t">
            {!isAuthenticated() ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </DialogTrigger>
                <DialogTitle />
                <DialogContent className="p-0 max-h-[80vh] overflow-y-auto no-scrollbar">
                  <AuthForm />
                </DialogContent>
              </Dialog>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Welcome back!
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(PureMobileNavigator, (prevProps, nextProps) => {
  return prevProps.isVisible === nextProps.isVisible;
});
