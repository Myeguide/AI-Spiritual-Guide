import { Dispatch, SetStateAction, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy, RefreshCcw, Share2, SquarePen } from "lucide-react";
import { UIMessage } from "ai";
import { UseChatHelpers } from "@ai-sdk/react";
import { deleteTrailingMessages } from "@/frontend/dexie/queries";
import { useUserStore } from "../stores/UserStore";
import { apiCall } from "@/utils/api-call";

interface MessageControlsProps {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers["setMessages"];
  content: string;
  setMode?: Dispatch<SetStateAction<"view" | "edit">>;
  reload: UseChatHelpers["reload"];
  stop: UseChatHelpers["stop"];
}

export default function MessageControls({
  threadId,
  message,
  setMessages,
  content,
  setMode,
  reload,
  stop,
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated());

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setShared(true);
    setTimeout(() => {
      setShared(false);
    }, 2000);
  };

  const handleRegenerate = async () => {
    // stop the current request
    stop();

    if (message.role === "user") {
      await deleteTrailingMessages(threadId, message.createdAt as Date, false);
      await apiCall("/api/messages/delete-trailing", "DELETE", {
        threadId,
        createdAt: message.createdAt as Date,
        gte: false,
      });

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index + 1)];
        }

        return messages;
      });
    } else {
      await deleteTrailingMessages(threadId, message.createdAt as Date);
      await apiCall("/api/messages/delete-trailing", "DELETE", {
        threadId,
        createdAt: message.createdAt as Date,
      });

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index)];
        }

        return messages;
      });
    }

    setTimeout(() => {
      reload();
    }, 0);
  };

  return (
    <div
      className={cn(
        "flex gap-1",
        {
          "opacity-0 group-hover:opacity-100 transition-opacity duration-100 absolute mt-5 right-2": message.role === "user",
          "opacity-100 transition-opacity duration-100": message.role !== "user",
        }
      )}
    >
      <Button variant="ghost" size="icon" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleShare}>
        {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      </Button>
      {setMode && isAuthenticated && (
        <Button variant="ghost" size="icon" onClick={() => setMode("edit")}>
          <SquarePen className="w-4 h-4" />
        </Button>
      )}
      {isAuthenticated && (
        <Button variant="ghost" size="icon" onClick={handleRegenerate}>
          <RefreshCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
