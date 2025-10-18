import Chat from "@/frontend/components/Chat";
import { v4 as uuidv4 } from "uuid";
import { useUserStore } from "@/frontend/stores/UserStore";
import AuthForm from "@/frontend/components/AuthForm";
import "react-international-phone/style.css";

export default function Home() {
  const { isAuthenticated, user } = useUserStore();
  const isUserStoreHydrated = useUserStore.persist?.hasHydrated();

  if (!isUserStoreHydrated) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated() || !user) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full max-w-sm md:max-w-3xl py-20 mx-auto">
        <AuthForm />
      </div>
    );
  }

  // Authenticated - show chat
  return <Chat threadId={uuidv4()} initialMessages={[]} />;
}
