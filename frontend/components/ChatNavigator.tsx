import { useLiveQuery } from "dexie-react-hooks";
import { memo } from "react";
import { MessageCirclePlus } from "lucide-react";
import { Button } from "./ui/button";
import { db } from "../dexie/db";
import { useNavigate, useParams } from "react-router";
import { useUserStore } from "../stores/UserStore";
import { SidebarFooter } from "@/frontend/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import AuthForm from "./AuthForm";
import { NavUser } from "./NavUser";
import { cn } from "@/lib/utils";
import { useSubscriptionStore } from "@/frontend/stores/SubscriptionStore";

interface MessageNavigatorProps {
  threadId: string;
  isVisible: boolean;
  onClose: () => void;
}

function PureChatNavigator({ isVisible, onClose }: MessageNavigatorProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const threads = useLiveQuery(
    () => db.threads.orderBy("lastMessageAt").reverse().toArray(),
    []
  );

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
              onClick={() => {
                navigate("/chat");
                onClose();
              }}
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-[#B500FF] text-white rounded"
              aria-label="Close navigator"
            >
              <MessageCirclePlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden p-2">
            <ul className="flex flex-col gap-2 px-4 py-2 prose prose-sm dark:prose-invert list-disc pl-5 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full">
              {threads?.map((thread) => (
                <li
                  key={thread.id}
                  onClick={() => {
                    if (id === thread.id) {
                      return;
                    }
                    navigate(`/chat/${thread.id}`);
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer hover:text-foreground transition-colors",
                    id === thread.id && "bg-secondary rounded"
                  )}
                >
                  {thread.title.slice(0, 30)}..
                </li>
              ))}
            </ul>
          </div>
          <Footer />
        </div>
      </aside>
    </>
  );
}

export default memo(PureChatNavigator, (prevProps, nextProps) => {
  return (
    prevProps.threadId === nextProps.threadId &&
    prevProps.isVisible === nextProps.isVisible
  );
});

const PureFooter = () => {
  const { isAuthenticated } = useUserStore();
  const { subscription } = useSubscriptionStore();
  const navigate = useNavigate();

  const isOnFreePlan = subscription?.subscription?.planType === "free";
  return (
    <SidebarFooter>
      {!isAuthenticated() ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Login</Button>
          </DialogTrigger>
          <DialogTitle />
          <DialogContent className="p-0">
            <AuthForm />
          </DialogContent>
        </Dialog>
      ) : (
        <div className="space-y-2">
          {isOnFreePlan && (
            <Button
              onClick={() => navigate("/billing")}
              className="w-full bg-[#B500FF] text-white hover:bg-[#B500FF]/90"
            >
              Upgrade Plan
            </Button>
          )}
          <NavUser />
        </div>
      )}
    </SidebarFooter>
  );
};

const Footer = memo(PureFooter);
