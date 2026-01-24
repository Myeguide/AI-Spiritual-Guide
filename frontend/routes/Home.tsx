import Chat from "@/frontend/components/Chat";
import { v4 as uuidv4 } from "uuid";
import { useUserStore } from "@/frontend/stores/UserStore";
import "react-international-phone/style.css";

export default function Home() {
  const isUserStoreHydrated = useUserStore.persist?.hasHydrated();

  if (!isUserStoreHydrated) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Guest or authenticated - show chat
  return <Chat threadId={uuidv4()} initialMessages={[]} />;
}
