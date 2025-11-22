import { BrowserRouter, Route, Routes } from "react-router";
import ChatLayout from "./ChatLayout";
import Home from "./routes/Home";
import Index from "./routes/Index";
import Thread from "./routes/Thread";
import PricingPage from "@/frontend/components/Pricing";
import { useEffect, useState } from "react";
import { syncDataFromServer } from "@/lib/sync-server";
import { useUserStore } from "./stores/UserStore";
import UserProfile from "@/frontend/components/Profile";

export default function App() {
  const [isSynced, setIsSynced] = useState(false);
  const { user, token, fetchSubscription } = useUserStore();
  const authenticated = !!user && !!token;

  useEffect(() => {
    const initializeSync = async () => {
      console.log("Initializing data sync...");
      if (!authenticated || isSynced) return;

      try {
        await syncDataFromServer();
        setIsSynced(true);
      } catch (error) {
        console.error("❌ Error syncing data:", error);
        setIsSynced(false);
      }
    };

    initializeSync();
  }, [authenticated, isSynced]);

  // Handle online/visibility events
  useEffect(() => {
    if (!authenticated) return;

    const handleResync = () => setIsSynced(false);

    window.addEventListener("online", handleResync);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleResync();
    });

    return () => {
      window.removeEventListener("online", handleResync);
      document.removeEventListener("visibilitychange", handleResync);
    };
  }, [authenticated]);

  // Fetch subscription when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchSubscription();
    }
  }, [authenticated, fetchSubscription]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="chat" element={<ChatLayout />}>
          <Route index element={<Home />} />
          <Route path=":id" element={<Thread />} />
        </Route>
        <Route path="/billing" element={<PricingPage />} />
        <Route path="/account" element={<UserProfile />} />
        <Route path="*" element={<p> Not found </p>} />
      </Routes>
    </BrowserRouter>
  );
}
