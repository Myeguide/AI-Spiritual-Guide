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
import MainLayout from "./MainLayout";

export default function App() {
  const [isSynced, setIsSynced] = useState(false);
  const { user, token, fetchSubscription, verifySession, sessionChecked } = useUserStore();
  const authenticated = !!user && !!token;

  // Verify session on app load - check if token is still valid
  useEffect(() => {
    const checkSession = async () => {
      if (user && token && !sessionChecked) {
        console.log("Verifying session...");
        const isValid = await verifySession();
        if (!isValid) {
          console.log("Session expired, user has been logged out");
        }
      }
    };

    checkSession();
  }, [user, token, sessionChecked, verifySession]);

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

  // Handle online/visibility events - also re-verify session
  useEffect(() => {
    if (!authenticated) return;

    const handleResync = () => setIsSynced(false);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResync();
        // Re-verify session when tab becomes visible
        verifySession();
      }
    };

    window.addEventListener("online", handleResync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleResync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authenticated, verifySession]);

  // Fetch subscription when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchSubscription();
    }
  }, [authenticated, fetchSubscription]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Layout with footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/billing" element={<PricingPage />} />
          <Route path="/account" element={<UserProfile />} />
        </Route>

        {/* Chat layout WITHOUT footer */}
        <Route path="chat" element={<ChatLayout />}>
          <Route index element={<Home/>} />
          <Route path=":id" element={<Thread />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </BrowserRouter>
  );
}
