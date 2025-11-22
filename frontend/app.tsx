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
  const { isAuthenticated, fetchSubscription } = useUserStore();

  // Sync on app mount if already authenticated
  useEffect(() => {
    const initializeSync = async () => {
      if (!isAuthenticated()) {
        return;
      }
      if (isSynced) {
        return;
      }
      try {
        await syncDataFromServer();
        setIsSynced(true);
      } catch (error) {
        console.error("❌ Error syncing data:", error);
        setIsSynced(false);
      }
    };
    initializeSync();
  }, [isAuthenticated, isSynced]);

  // Sync when user comes back online
  useEffect(() => {
    if (!isAuthenticated()) return;
    const handleOnline = async () => {
      setIsSynced(false); // Trigger re-sync
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [isAuthenticated]);

  // Sync when tab becomes visible again
  useEffect(() => {
    if (!isAuthenticated()) return;
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        setIsSynced(false); // Trigger re-sync
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchSubscription();
    }
  }, [fetchSubscription, isAuthenticated]);

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
