import { useChat } from "@ai-sdk/react";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import ChatNavigator from "./ChatNavigator";
import { UIMessage } from "ai";
import { createMessage } from "@/frontend/dexie/queries";
import ThemeToggler from "./ui/ThemeToggler";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator";
import { useUserStore } from "@/frontend/stores/UserStore";
import { useEffect, useRef } from "react";
import { apiCall } from "@/utils/api-call";
import { useNavigate } from "react-router";
import { getOrCreateAnonymousId } from "@/frontend/utils/anonymous";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const userConfig = useUserStore((state) => state.token);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use ref to prevent race conditions between onResponse and onError
  const {
    isNavigatorVisible,
    handleToggleNavigator,
    closeNavigator,
    registerRef,
  } = useChatNavigator();

  const {
    messages,
    input,
    status,
    setInput,
    setMessages,
    append,
    stop,
    reload,
    error, // Use this built-in error
  } = useChat({
    id: threadId,
    initialMessages,
    experimental_throttle: 50,
    onFinish: async (message) => {
      const aiMessage: UIMessage = {
        id: message.id,
        parts: message.parts as UIMessage["parts"],
        role: "assistant",
        content: message.content,
        createdAt: new Date(),
      };
      try {
        await createMessage(threadId, aiMessage);
        await apiCall("/api/messages", "POST", {
          threadId,
          message: aiMessage,
        });
      } catch (error) {
        console.error(error);
      }
    },
    headers: {
      ...(userConfig ? { Authorization: `Bearer ${userConfig}` } : {}),
      ...(!userConfig ? { "X-Anonymous-Id": getOrCreateAnonymousId() } : {}),
    },
  });

  // Auto-scroll to bottom when messages change or when streaming
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Handle session expiration during chat
  useEffect(() => {
    if (error) {
      try {
        const parsed = JSON.parse(error.message);
        // Check if error indicates session expired (401 Unauthorized)
        if (
          parsed.error === "Invalid or expired token" ||
          parsed.error === "Unauthorized - No token provided" ||
          parsed.error === "Unauthorized - Invalid token"
        ) {
          logout();
          navigate("/chat");
        }
      } catch {
        // Not a JSON error, check for common auth error messages
        if (
          error.message.includes("Unauthorized") ||
          error.message.includes("expired token") ||
          error.message.includes("Invalid token")
        ) {
          logout();
          navigate("/chat");
        }
      }
    }
  }, [error, logout, navigate]);

  const rateLimitError = error
    ? (() => {
        try {
          const parsed = JSON.parse(error.message);
          return {
            message: parsed.error || "Error",
            details: parsed.message || "Something went wrong",
          };
        } catch {
          return {
            message: "Error",
            details: error.message,
          };
        }
      })()
    : null;

  return (
    <div
      ref={scrollContainerRef}
      className="relative w-full h-screen overflow-y-auto no-scrollbar sm:scrollbar sm:scrollbar-thumb-muted-foreground/30 sm:scrollbar-track-muted/50 hover:sm:scrollbar-thumb-muted-foreground/60"
    >
      <ChatSidebarTrigger />
      {/* Fixed header bar for small devices with background */}
      <div className="fixed top-0 right-0 left-0 h-12 bg-background/80 backdrop-blur-md z-20 sm:hidden flex items-center justify-end px-2 gap-1">
        <ThemeToggler className="relative top-auto right-auto" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggleNavigator}
              variant="ghost"
              size="icon"
              aria-label={
                isNavigatorVisible
                  ? "Hide message navigator"
                  : "Show message navigator"
              }
            >
              <Menu className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            Message Navigator
          </TooltipContent>
        </Tooltip>
      </div>
      <main className="flex flex-col w-full max-w-3xl pt-14 sm:pt-10 pb-44 mx-auto transition-all duration-300 ease-in-out min-h-screen">
        <Messages
          threadId={threadId}
          messages={messages}
          status={status}
          setMessages={setMessages}
          reload={reload}
          error={error}
          registerRef={registerRef}
          stop={stop}
        />
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <h1 className="font-semibold text-foreground">
              Your questions. Answered by the Vedas.
            </h1>
            <p className="text-muted-foreground">
              Find clarity for life’s dilemmas, conflicts, and spiritual concerns. The more you share, the more personal your answers become.
            </p>
            <p className="text-muted-foreground">
              Ask freely- everything you share stays private and confidential.
            </p>
          </div>
        )}
        <ChatInput
          threadId={threadId}
          input={input}
          status={status}
          append={append}
          setInput={setInput}
          stop={stop}
          rateLimitError={rateLimitError}
        />
      </main>
      {/* ThemeToggler visible on larger screens */}
      <div className="hidden sm:block">
        <ThemeToggler />
      </div>

      <ChatNavigator
        threadId={threadId}
        isVisible={isNavigatorVisible}
        onClose={closeNavigator}
      />
    </div>
  );
}

const ChatSidebarTrigger = () => {
  const { state } = useSidebar();
  if (state === "collapsed") {
    return <SidebarTrigger className="fixed left-4 top-4 z-100" />;
  }
  return null;
};
