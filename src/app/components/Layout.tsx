import { Outlet } from "react-router";
import { Navbar, BottomNav } from "./Navbar";
import { RotoBotAppPlug } from "./RotoBotAppPlug";
import { BracketProvider } from "../context/BracketContext";
import { Toast } from "./Toast";

export function Layout() {
  return (
    <BracketProvider>
      <div style={{ minHeight: "100vh" }}>
        <Navbar />
        <div style={{ paddingTop: "56px" }}>
          <RotoBotAppPlug variant="topBanner" />
          <Outlet />
        </div>
        <BottomNav />
        <Toast />
      </div>
    </BracketProvider>
  );
}
