import { ArrowUpIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { Textarea } from "@/frontend/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/button";
import useAutoResizeTextarea from "@/hooks/useAutoResizeTextArea";
import { UseChatHelpers } from "@ai-sdk/react";
import { useParams } from "react-router";
import { useNavigate } from "react-router";
import { createMessage, createThread } from "@/frontend/dexie/queries";
import AuthForm from "@/frontend/components/AuthForm";
import { UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { StopIcon } from "./ui/icons";
import { toast } from "sonner";
import { useMessageSummary } from "@/frontend/hooks/useMessageSummary";
import { useUserStore } from "@/frontend/stores/UserStore";
import { TokenLimitExceeded } from "./RateWarning";
import { apiCall } from "@/utils/api-call";

interface ChatInputProps {
  threadId: string;
  rateLimitError: {
    message: string;
    details?: any;
  } | null;
  input: UseChatHelpers["input"];
  status: UseChatHelpers["status"];
  setInput: UseChatHelpers["setInput"];
  append: UseChatHelpers["append"];
  stop: UseChatHelpers["stop"];
}

interface StopButtonProps {
  stop: UseChatHelpers["stop"];
}

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  isLoading: boolean;
}

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ type: "text", text }],
  role: "user",
  content: text,
  createdAt: new Date(),
});

function PureChatInput({
  threadId,
  input,
  status,
  setInput,
  append,
  stop,
  rateLimitError,
}: ChatInputProps) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());
  const { subscription, subscriptionLoading, subscriptionFetched } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<{
    message: string;
    details: string;
  } | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  });
  const navigate = useNavigate();
  const { id } = useParams();
  const isDisabled = useMemo(
    () =>
      !input.trim() ||
      status === "streaming" ||
      status === "submitted" ||
      isSubmitting,
    [input, status, isSubmitting]
  );

  const { complete } = useMessageSummary();
  const handleSubmit = useCallback(async () => {
    const currentInput = textareaRef.current?.value || input;
    if (!currentInput.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Check rate limit first - show error and popup
    if (rateLimitError) {
      return; // Don't proceed with submission
    }

    // Check subscription
    if (!subscription.hasActiveSubscription) {
      setSubscriptionError({
        message: "Subscription Required",
        details: "Please subscribe to send messages",
      });
      return;
    }

    if (status === "streaming" || status === "submitted") {
      return;
    }

    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const messageId = uuidv4();
      const userMessage = createUserMessage(messageId, currentInput.trim());
      if (!id) {
        try {
          navigate(`/chat/${threadId}`);
          await createThread(threadId); // create thread locally first
          const threadResponse = await apiCall("/api/threads", "POST", {
            threadId,
          });
          if (!threadResponse.success) {
            throw new Error("Failed to create thread on server");
          }
          complete(currentInput.trim(), {
            body: { threadId, messageId, isTitle: true },
          });
        } catch (error) {
          console.error("Error creating thread:", error);
          toast.error("Failed to create new chat. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }
      try {
        await createMessage(threadId, userMessage); // save message locally first
      } catch (error) {
        console.error("Error saving message locally:", error);
        toast.error("Failed to save message locally");
        setIsSubmitting(false);
        return;
      }
      apiCall("/api/messages", "POST", {
        threadId,
        message: userMessage,
      }).catch((error) => {
        console.error("Error saving message to server:", error);
        toast.error("Message sent but failed to sync with server");
      });
      append(userMessage);
      setInput("");
      adjustHeight(true);
      textareaRef.current?.focus();
      setSubscriptionError(null);
    } catch (error) {
      console.error("Error submitting message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    input,
    status,
    setInput,
    adjustHeight,
    append,
    id,
    textareaRef,
    threadId,
    complete,
    navigate,
    isSubmitting,
    rateLimitError,
    subscription.hasActiveSubscription,
  ]);

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-90 bg-background bg-opacity-90 flex items-center justify-center">
        <AuthForm />
      </div>
    );
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        handleSubmit();
      }
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  // Combine errors - rateLimitError takes precedence
  const displayError = rateLimitError || subscriptionError;

  return (
    <div className="fixed bottom-0 w-full max-w-3xl">
      {displayError && (
        <TokenLimitExceeded
          navigate={navigate}
          reason={displayError.details}
        />
      )}
      <div className="bg-secondary rounded-t-[20px] p-2 pb-0 w-full">
        <div className="relative">
          <div className="flex flex-col">
            <div className="bg-secondary overflow-y-auto max-h-[300px]">
              <Textarea
                id="chat-input"
                value={input}
                placeholder={
                  rateLimitError
                    ? rateLimitError.message
                    : subscriptionLoading || !subscriptionFetched
                      ? "Loading..."
                      : !subscription.hasActiveSubscription
                        ? "Please subscribe to send messages"
                        : "Ask your questions"
                }
                disabled={subscriptionLoading || !subscriptionFetched}
                className={cn(
                  "w-full px-4 py-3 border-none shadow-none dark:bg-transparent",
                  "placeholder:text-muted-foreground resize-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                  "scrollbar-thumb-rounded-full",
                  "min-h-[72px]"
                )}
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                aria-label="Chat message input"
                aria-describedby="chat-input-description"
              />
              <span id="chat-input-description" className="sr-only">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>

            <div className="h-14 flex items-center px-2">
              <div className="flex items-center justify-between w-full">
                <div></div> {/* subscription tag (if any) can go here */}
                {status === "submitted" || status === "streaming" ? (
                  <StopButton stop={stop} />
                ) : (
                  <SendButton
                    onSubmit={handleSubmit}
                    disabled={isDisabled}
                    isLoading={isSubmitting}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChatInput = memo(PureChatInput, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.rateLimitError !== nextProps.rateLimitError) return false;
  return true;
});

function PureStopButton({ stop }: StopButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={stop}
      aria-label="Stop generating response"
      className="bg-[#B500FF]!"
    >
      <StopIcon size={20} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

const PureSendButton = ({ onSubmit, disabled, isLoading }: SendButtonProps) => {
  return (
    <Button
      onClick={onSubmit}
      variant="default"
      size="icon"
      disabled={disabled}
      aria-label="Send message"
      className="bg-[#B500FF] text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <ArrowUpIcon size={18} />
      )}
    </Button>
  );
};

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  return true;
});

export default ChatInput;