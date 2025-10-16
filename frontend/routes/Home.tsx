import Chat from "@/frontend/components/Chat";
import { v4 as uuidv4 } from "uuid";
import { MessageSquare } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { useUserStore } from "@/frontend/stores/UserStore";
import AuthForm from "@/frontend/components/AuthForm";

export default function Home() {
  // const { isAuthenticated, user } = useUserStore();
  // const isUserStoreHydrated = useUserStore.persist?.hasHydrated();

  // if (!isUserStoreHydrated) {
  //   return (
  //     <div className="flex items-center justify-center w-full h-full">
  //       <div className="animate-pulse">Loading...</div>
  //     </div>
  //   );
  // }

  // if (!isAuthenticated() || !user) {
  //   return (
  //     <div className="flex flex-col items-center justify-center w-full h-full max-w-sm md:max-w-3xl py-20 mx-auto">
  //       <Card className="w-full max-w-2xl mx-auto">
  //         <CardHeader>
  //           <div className="flex items-center gap-2">
  //             <MessageSquare className="h-5 w-5" />
  //             <CardTitle>Welcome to AI Chat</CardTitle>
  //           </div>
  //           <CardDescription>
  //             Login or create a new account to start chatting.
  //           </CardDescription>
  //         </CardHeader>
  //         <AuthForm />
  //       </Card>
  //     </div>
  //   );
  // }

  // Authenticated - show chat
  return <Chat threadId={uuidv4()} initialMessages={[]} />;
}
