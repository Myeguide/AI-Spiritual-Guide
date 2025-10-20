import { useChat } from "@ai-sdk/react";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import ChatNavigator from "./ChatNavigator";
import { UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { createMessage } from "@/frontend/dexie/queries";
import ThemeToggler from "./ui/ThemeToggler";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import { MessageSquareMore } from "lucide-react";
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator";
import { useUserStore } from "@/frontend/stores/UserStore";
import { useState } from "react";

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
      console.log("messages", message)
      setRateLimitError(null);
      const aiMessage: UIMessage = {
        id: message.id,
        parts: message.parts,  // This will have the correct parts structure
        role: "assistant",
        content: message.content,
        createdAt: new Date(),
      };
      console.log("ai message", aiMessage);
      try {
        await createMessage(threadId, aiMessage);
      } catch (error) {
        console.error(error);
      }
    },
    onResponse: async (response) => {
      // Handle rate limit errors
      if (response.status === 429) {
        const errorData = await response.json();
        console.error('Rate limit exceeded:', errorData);

        setRateLimitError({
          message: errorData.error,
          details: errorData.details,
        });
      } else if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
      } else {
        // Clear error on success
        setRateLimitError(null);
      }
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
