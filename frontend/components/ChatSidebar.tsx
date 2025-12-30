import { memo, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/frontend/components/ui/sidebar";
import { deleteThread, getThreads } from "@/frontend/dexie/queries";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, buttonVariants } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import AuthForm from "./AuthForm";
import { useUserStore } from "@/frontend/stores/UserStore";
import { useSubscriptionStore } from "@/frontend/stores/SubscriptionStore";
import { NavUser } from "./NavUser";
import { apiCall } from "@/utils/api-call";
import { db } from "../dexie/db";

export default function ChatSidebar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const threads = useLiveQuery(
    () => db.threads.orderBy("lastMessageAt").reverse().toArray(),
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        navigate("/chat");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const debugQuery = async () => {
      // Direct query to check
      await db.threads.toArray();

      // Your getThreads function
      await getThreads();
    };

    debugQuery();
  }, []);

  return (
    <Sidebar>
      <div className="flex flex-col h-full p-2">
        <Header />
        <SidebarContent className="no-scrollbar">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {threads?.map((thread) => {
                  return (
                    <SidebarMenuItem key={thread.id}>
                      <div
                        className={cn(
                          "cursor-pointer group/thread h-9 flex items-center px-2 py-1 rounded-[8px] overflow-hidden w-full hover:bg-secondary",
                          id === thread.id && "bg-secondary"
                        )}
                        onClick={() => {
                          if (id === thread.id) {
                            return;
                          }
                          navigate(`/chat/${thread.id}`);
                        }}
                      >
                        <span className="truncate block">{thread.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hidden group-hover/thread:flex ml-auto h-7 w-7"
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            await deleteThread(thread.id);
                            await apiCall(
                              `/api/threads?threadId=${id}`,
                              "DELETE"
                            );
                            navigate(`/chat`);
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <Footer />
      </div>
    </Sidebar>
  );
}

function PureHeader() {
  return (
    <SidebarHeader className="relative flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between w-full">
        <img src="/ET.png" alt="logo" className="h-10 w-auto object-contain" />
        <SidebarTrigger />
      </div>
      <Link
        to="/chat"
        className={buttonVariants({
          variant: "default",
          className: "w-full bg-[#B500FF]! text-white",
        })}
      >
        New Chat
      </Link>
    </SidebarHeader>
  );
}

const Header = memo(PureHeader);
const PureFooter = () => {
  const { isAuthenticated } = useUserStore();
  const { subscription } = useSubscriptionStore();
  const navigate = useNavigate();

  const isOnFreePlan = subscription?.subscription?.planType === 'free';

  return (
    <SidebarFooter>
      {!isAuthenticated() ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Login</Button>
          </DialogTrigger>
          <DialogTitle />
          <DialogContent className="p-0 max-h-[80vh] overflow-y-auto no-scrollbar">
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
