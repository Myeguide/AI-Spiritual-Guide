import { useChat } from "@ai-sdk/react";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import ChatNavigator from "./ChatNavigator";
import { UIMessage } from "ai";
import { createMessage } from "@/frontend/dexie/queries";
import ThemeToggler from "./ui/ThemeToggler";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { Menu, MessageSquareMore } from "lucide-react";
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator";
import { useUserStore } from "@/frontend/stores/UserStore";
import { useState, useRef } from "react";
import { apiCall } from "@/utils/api-call";

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const userConfig = useUserStore((state) => state.token);
  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    details?: any;
  } | null>(null);
  
  // Use ref to prevent race conditions between onResponse and onError
  const errorSetRef = useRef(false);

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
    error,
  } = useChat({
    id: threadId,
    initialMessages,
    experimental_throttle: 50,
    onFinish: async (message) => {
      // Clear error on successful completion
      errorSetRef.current = false;
      setRateLimitError(null);
      
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
    onResponse: async (response) => {
      if (response.ok) {
        setRateLimitError(null);
      }
      // That's it! Don't track status codes
    },
    
    onError: (e) => {
      let serverError = {
        error: "Error",
        message: "Something went wrong",
      };
      
      try {
        const parsed = JSON.parse(e.message);
        serverError = {
          error: parsed.error || "Error",
          message: parsed.message || "Something went wrong",
        };
      } catch {
        serverError.message = e.message;
      }
      
      setRateLimitError({
        message: serverError.error,
        details: serverError.message,
      });
    },
    headers: {
      Authorization: `Bearer ${userConfig}`,
    },
  });



  return (
    <div className="relative w-full">
      <ChatSidebarTrigger />
      <main
        className={`flex flex-col w-full max-w-3xl pt-10 pb-44 mx-auto transition-all duration-300 ease-in-out`}
      >
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
      <ThemeToggler />
      <Button
        onClick={handleToggleNavigator}
        variant="ghost"
        size="icon"
        className="fixed right-10 top-1 z-20 sm:hidden"
        aria-label={
          isNavigatorVisible
            ? "Hide message navigator"
            : "Show message navigator"
        }
      >
        <Menu className="h-5 w-5"/>
      </Button>

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