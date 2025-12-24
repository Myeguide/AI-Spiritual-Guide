import { Outlet } from "react-router";
import Footer from "./components/Footer";
import BackButton from "./components/ui/BackButton";

export default function MainLayout() {
  return (
    <>
      <Outlet />
      <BackButton />
      <Footer />
    </>
  );
}
