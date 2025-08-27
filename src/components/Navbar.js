// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";
import logo from "../logo.png";

/**
 * Global navbar + mobile drawer.
 * - Shows brand logo + text
 * - Notification bell
 * - Role-aware links inside the drawer
 * - Logout button
 */
export default function Navbar() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const LinkItem = ({ to, children, onClick }) => (
    <button
      onClick={() => (onClick ? onClick() : go(to))}
      className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 transition"
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-40 w-full bg-red-600 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand: logo + text */}
          <button
            type="button"
            aria-label="Go to home"
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <img
              src={logo}
              alt="Amar Rokto"
              className="h-8 w-auto object-contain"
            />
            {/* keep the brand text on ≥sm screens; hide on very small screens */}
            <span className="hidden sm:inline text-xl font-bold">Amar Rokto</span>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              aria-label="Open menu"
              className="ml-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={() => setOpen(true)}
            >
              <span className="block w-5 h-0.5 bg-white mb-1 rounded" />
              <span className="block w-5 h-0.5 bg-white mb-1 rounded" />
              <span className="block w-5 h-0.5 bg-white rounded" />
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {/* Header with logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <img
            src={logo}
            alt="Amar Rokto"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-red-200"
          />
          <div className="font-semibold">Amar Rokto</div>
        </div>

        <div className="py-2">
          <LinkItem to="/home">Home</LinkItem>

          {/* Request/Donate only for general users */}
          {role !== "bloodbank" && (
            <>
              <LinkItem to="/request-blood">Request Blood</LinkItem>
              <LinkItem to="/schedule-donation">Schedule Donation</LinkItem>
              <LinkItem to="/donor-dashboard">Donor Dashboard</LinkItem>
              <LinkItem to="/receiver-dashboard">Receiver Dashboard</LinkItem>
              <LinkItem to="/profile">Profile</LinkItem>
            </>
          )}

          {/* Blood bank operators */}
          {role === "bloodbank" && (
            <>
              <LinkItem to="/admin">Bank Dashboard</LinkItem>
              <LinkItem to="/profile">Profile</LinkItem>
            </>
          )}

          {/* Admin */}
          {role === "admin" && <LinkItem to="/admin">Admin</LinkItem>}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} Amar Rokto
          </div>
          <button
            onClick={async () => {
              try {
                await signOut(auth);
                setOpen(false);
                navigate("/login");
              } catch (e) {
                console.error("Logout error:", e);
              }
            }}
            className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
