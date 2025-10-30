import { useChat } from "@ai-sdk/react";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import ChatNavigator from "./ChatNavigator";
import { UIMessage } from "ai";
import { createMessage } from "@/frontend/dexie/queries";
import ThemeToggler from "./ui/ThemeToggler";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { MessageSquareMore } from "lucide-react";
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator";
import { useUserStore } from "@/frontend/stores/UserStore";
import { useState } from "react";
import { apiCall } from "@/utils/api-call";

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const userConfig = useUserStore((state) => state.token);
  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  } | null>(null);
  const {
    isNavigatorVisible,
    handleToggleNavigator,
    closeNavigator,
    registerRef,
    scrollToMessage,
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
      // message now contains proper parts array
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
      // Read response body once, outside the conditionals
      let errorData: { error: string; message: string } | null = null;
      if (!response.ok) {
        try {
          errorData = await response.json();
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorData = {
            error: "Unknown Error",
            message: "Failed to parse server response",
          };
        }
      }

      // Handle different error types
      if (response.status === 403) {
        console.error("Subscription error:", errorData);
        setRateLimitError({
          message: errorData?.error || "Subscription Error",
          details:
            errorData?.message || "Please check your subscription status",
        });
        console.log("here value being se for subscripiton");
      } else if (response.status === 429) {
        console.error("Rate limit exceeded:", errorData);
        setRateLimitError({
          message: errorData?.error || "Request Limit Exceeded",
          details: errorData?.message || "You have reached your request limit",
        });
      } else if (response.status === 401) {
        console.error("Unauthorized:", errorData);
        setRateLimitError({
          message: "Unauthorized",
          details: "Please login again",
        });
      } else if (!response.ok) {
        console.error("API error:", errorData);
        setRateLimitError({
          message: errorData?.error || "Error",
          details: errorData?.message || "Something went wrong",
        });
      } else {
        // Clear error on success
        setRateLimitError(null);
      }
    },
    onError: () => {
      // Handle network or other errors
      console.error("Chat error:", rateLimitError?.details);
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
        variant="outline"
        size="icon"
        className="fixed right-16 top-4 z-20"
        aria-label={
          isNavigatorVisible
            ? "Hide message navigator"
            : "Show message navigator"
        }
      >
        <MessageSquareMore className="h-5 w-5" />
      </Button>

      <ChatNavigator
        threadId={threadId}
        scrollToMessage={scrollToMessage}
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
