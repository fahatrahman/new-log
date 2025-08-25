// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const item =
    "w-full text-left px-4 py-2.5 rounded-md hover:bg-red-50 active:bg-red-100 transition font-medium";
  const section =
    "px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-400";

  return (
    <>
      {/* Top Nav */}
      <nav className="bg-red-600 text-white sticky top-0 z-50 flex justify-between items-center px-4 md:px-6 py-3 font-sans shadow-md">
        <span
          className="cursor-pointer select-none text-xl font-bold"
          onClick={() => navigate("/home")}
        >
          Amar Rokto
        </span>
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
      </nav>

      {/* Dimmed overlay when sidebar open */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white z-[70] shadow-2xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
              AR
            </div>
            <div className="leading-tight">
              <div className="font-semibold">Amar Rokto</div>
              <div className="text-xs text-gray-500 capitalize">
                {user ? role || "user" : "guest"}
              </div>
            </div>
          </div>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          {user && role === "user" && (
            <>
              <div className={section}>Navigation</div>
              <button onClick={() => { navigate("/home"); setOpen(false); }} className={item}>Home</button>
              <button onClick={() => { navigate("/profile"); setOpen(false); }} className={item}>Profile</button>
              <button onClick={() => { navigate("/request-blood"); setOpen(false); }} className={item}>Request Blood</button>
              <button onClick={() => { navigate("/schedule-donation"); setOpen(false); }} className={item}>Schedule Donation</button>
              <button onClick={() => { navigate("/donor-dashboard"); setOpen(false); }} className={item}>My Donation Dashboard</button>
              <button onClick={() => { navigate("/analysis"); setOpen(false); }} className={item}>Analysis</button>
            </>
          )}

          {user && role === "bloodbank" && (
            <>
              <div className={section}>Blood Bank</div>
              <button onClick={() => { navigate(`/bloodbank/edit/${user.uid}`); setOpen(false); }} className={item}>Inventory</button>
              <button onClick={() => { navigate(`/bloodbank/edit/${user.uid}#alerts`); setOpen(false); }} className={item}>Urgent Alerts</button>
              <button onClick={() => { navigate(`/bloodbank/${user.uid}`); setOpen(false); }} className={item}>Public Page</button>
              <button onClick={() => { navigate("/analysis"); setOpen(false); }} className={item}>Analysis</button>
              <button onClick={() => { navigate("/home"); setOpen(false); }} className={item}>Home</button>
            </>
          )}

          {user && role === "admin" && (
            <>
              <div className={section}>Admin</div>
              <button onClick={() => { navigate("/admin"); setOpen(false); }} className={item}>Admin Dashboard</button>
              <button onClick={() => { navigate("/analysis"); setOpen(false); }} className={item}>Analysis</button>
              <button onClick={() => { navigate("/home"); setOpen(false); }} className={item}>Home</button>
            </>
          )}

          {!user && (
            <>
              <div className={section}>Welcome</div>
              <button onClick={() => { navigate("/home"); setOpen(false); }} className={item}>Home</button>
              <button onClick={() => { navigate("/login"); setOpen(false); }} className={item}>Login</button>
              <button onClick={() => { navigate("/register"); setOpen(false); }} className={item}>Register</button>
            </>
          )}

          <hr className="my-3" />

          {user && (
            <div className="px-4 pb-3">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition font-semibold shadow-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t text-xs text-gray-500">
          © {new Date().getFullYear()} Amar Rokto
        </div>
      </aside>
    </>
  );
}
