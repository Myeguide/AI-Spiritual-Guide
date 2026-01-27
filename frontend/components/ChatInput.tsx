import { ArrowUpIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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
  const { subscription, subscriptionLoading, subscriptionFetched } =
    useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [guestLimit, setGuestLimit] = useState<number | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
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
  const isGuestBlocked =
    !isAuthenticated && guestRemaining !== null && guestRemaining <= 0;
  const isDisabled = useMemo(() => {
    if (isGuestBlocked) return true;
    return (
      !input.trim() ||
      status === "streaming" ||
      status === "submitted" ||
      isSubmitting
    );
  }, [input, status, isSubmitting, isGuestBlocked]);

  const { complete } = useMessageSummary();

  // Fetch guest usage (no-login free quota)
  useEffect(() => {
    const fetchGuestUsage = async () => {
      if (isAuthenticated) return;
      try {
        const res = await apiCall("/api/anonymous/usage", "GET");
        if (res?.success && res?.data) {
          setGuestRemaining(res.data.remaining);
          setGuestLimit(res.data.limit);
        }
      } catch (e) {
        console.error("Failed to fetch guest usage:", e);
      }
    };

    fetchGuestUsage();
    // refresh after completion
    if (status === "ready") {
      fetchGuestUsage();
    }
  }, [isAuthenticated, status]);

  // Close the auth dialog after successful login/register
  useEffect(() => {
    if (isAuthenticated && showAuthDialog) {
      setShowAuthDialog(false);
    }
  }, [isAuthenticated, showAuthDialog]);

  // Combine errors - rateLimitError takes precedence
  const isGuestLimitError =
    !isAuthenticated && rateLimitError?.message === "Guest limit reached";

  const handleSubmit = useCallback(async () => {
    const currentInput = textareaRef.current?.value || input;
    if (!currentInput.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Check rate limit first - show error and popup
    if (rateLimitError) {
      if (isGuestLimitError) {
        setShowLimitModal(true);
      }
      return; // Don't proceed with submission
    }

    // Guest gating: allow up to 10 questions, then force login/register
    if (!isAuthenticated) {
      try {
        const res = await apiCall("/api/anonymous/usage", "GET");
        if (res?.success && res?.data) {
          setGuestRemaining(res.data.remaining);
          setGuestLimit(res.data.limit);
          if (!res.data.allowed) {
            setShowLimitModal(true);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check guest usage:", e);
      }
    }

    // Authenticated users must have a paid subscription
    if (isAuthenticated && !subscription.hasActiveSubscription) {
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
          // Create thread locally first (fast), then sync server in background
          await createThread(threadId);
          apiCall("/api/threads", "POST", { threadId }).catch((error) => {
            console.error("Error creating thread on server:", error);
          });
          // Kick off title generation in background (do not block send)
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
        // Save locally first (fast) so UI stays consistent even if offline
        await createMessage(threadId, userMessage);
      } catch (error) {
        console.error("Error saving message locally:", error);
        toast.error("Failed to save message locally");
        // Don't block sending/AI request even if local persistence fails
      }
      // Append immediately so the message appears instantly and AI request starts right away
      append(userMessage);
      setInput("");
      adjustHeight(true);
      textareaRef.current?.focus();
      setSubscriptionError(null);

      // Sync message to server in background (do not block)
      apiCall("/api/messages", "POST", { threadId, message: userMessage }).catch(
        (error) => {
          console.error("Error saving message to server:", error);
          toast.error("Message sent but failed to sync with server");
        }
      );
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
    isAuthenticated,
    isGuestLimitError,
  ]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        handleSubmit();
      }
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    adjustHeight();
    
    // Show modal if user tries to type after reaching limit
    if (isGuestBlocked && newValue.trim().length > 0) {
      setShowLimitModal(true);
    }
  };

  useEffect(() => {
    if (isGuestLimitError) {
      setShowLimitModal(true);
      setShowAuthDialog(false); // Close auth dialog if limit modal is shown
    }
  }, [isGuestLimitError]);

  // Also show modal when guest usage is fetched and limit is reached
  useEffect(() => {
    if (!isAuthenticated && guestRemaining !== null && guestRemaining <= 0) {
      setShowLimitModal(true);
    }
  }, [guestRemaining, isAuthenticated]);

  // Close limit modal after successful login/register
  useEffect(() => {
    if (isAuthenticated && showLimitModal) {
      setShowLimitModal(false);
    }
  }, [isAuthenticated, showLimitModal]);

  const displayError =
    (isGuestLimitError ? null : rateLimitError) ||
    (isAuthenticated ? subscriptionError : null);

  return (
    <div className="fixed bottom-0 w-full max-w-3xl">
      {displayError && (
        <TokenLimitExceeded navigate={navigate} reason={displayError.details} />
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
                    : isAuthenticated
                    ? subscriptionLoading || !subscriptionFetched
                      ? "Loading..."
                      : !subscription.hasActiveSubscription
                      ? "Please subscribe to send messages"
                      : "Ask Your Question"
                    : isGuestBlocked
                    ? "Login or register to continue"
                    : "Ask Your Question"
                }
                disabled={
                  isGuestBlocked ||
                  (isAuthenticated &&
                    (subscriptionLoading || !subscriptionFetched))
                }
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

      {/* Limit Reached Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>Free Question Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-4">
            <p className="text-sm text-muted-foreground">
              You've reached the limit of free questions. Please subscribe to our plan to continue asking questions.
            </p>
            
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setShowLimitModal(false);
                    navigate("/billing");
                  }}
                  className="w-full bg-[#B500FF] text-white hover:bg-[#9A00CC]"
                >
                  Go to Subscription Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLimitModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Please login or register to subscribe to a plan:
                </p>
                <AuthForm />
                <Button
                  variant="outline"
                  onClick={() => setShowLimitModal(false)}
                  className="w-full mt-2"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Keep existing Auth Dialog for backward compatibility */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[520px] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Login required</DialogTitle>
            <p className="text-sm text-muted-foreground">
              You've used all free questions. Please login or register to
              continue.
            </p>
          </DialogHeader>
          <div className="p-6 pt-4">
            <AuthForm />
          </div>
        </DialogContent>
      </Dialog>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={stop}
          aria-label="Stop generating response"
          className="bg-[#B500FF]!"
        >
          <StopIcon size={20} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        Stop generating
      </TooltipContent>
    </Tooltip>
  );
}

const StopButton = memo(PureStopButton);

const PureSendButton = ({ onSubmit, disabled, isLoading }: SendButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        Send message
      </TooltipContent>
    </Tooltip>
  );
};

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  return true;
});

export default ChatInput;
