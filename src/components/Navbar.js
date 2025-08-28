// src/components/Navbar.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import NotificationBell from "./NotificationBell";
import logo from "../logo.png"; // your PNG logo sitting in /src

const EDIT_PATH = (id) => `/bloodbank/${id}/edit`;

export default function Navbar() {
  const navigate = useNavigate();
  const { user, role } = useAuth(); // expects { user, role }, where user?.uid exists when logged in
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  const go = (path) => {
    navigate(path);
    close();
  };

  // Robust inventory navigation for blood banks:
  // 1) Try /BloodBanks/{uid} directly
  // 2) Fallback to searching BloodBanks where uid == authUid
  const goToInventory = async () => {
    try {
      const authUid = user?.uid || auth.currentUser?.uid;
      if (!authUid) {
        alert("Please sign in to access Inventory.");
        return;
      }

      const quick = await getDoc(doc(db, "BloodBanks", authUid));
      if (quick.exists()) {
        go(`/bloodbank/edit/${authUid}`);
        return;
      }

      const q = query(collection(db, "BloodBanks"), where("uid", "==", authUid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const bankId = snap.docs[0].id;
        go(`/bloodbank/edit/${bankId}`);
        return;
      }

      alert("No blood bank found for your account. Please create one or contact support.");
    } catch (e) {
      console.error("Inventory navigation error:", e);
      alert("Could not open Inventory. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      close();
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  // Menu items based on role
  const isBank = role === "bloodbank";
  const isUser = !isBank; // default to user-style menu for any other role

  return (
    <>
      {/* Top Bar */}
      <header className="bg-red-600 text-black sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Amar Rokto"
              className="h-10 w-10 rounded-full bg-white/90 p-[2px] shadow"
            />
            <span className="font-bold text-black text-xl">Amar Rokto</span>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={toggle}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-white/10"
              aria-label="Menu"
              title="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={close} />

          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="px-4 h-14 flex items-center border-b">
              <div className="flex items-center gap-2">
                <img src={logo} alt="logo" className="h-7 w-7 rounded-full" />
                <div className="font-semibold">Amar Rokto</div>
              </div>
              <button
                onClick={close}
                className="ml-auto h-8 w-8 rounded hover:bg-gray-100 grid place-items-center"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <nav className="p-3 flex-1 space-y-1">
              {/* Common: Home */}
              <button onClick={() => go("/")} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
                Home
              </button>

              {/* Role-specific */}
              {isBank ? (
                <>
                  <button onClick={goToInventory} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
                    Inventory
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => go("/donor-dashboard")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
                  >
                    Donor Dashboard
                  </button>
                  <button
                    onClick={() => go("/receiver-dashboard")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
                  >
                    Receiver Dashboard
                  </button>
                  <button
                    onClick={() => go("/profile")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
                  >
                    Profile
                  </button>
                </>
              )}
            </nav>

            {/* Drawer Footer */}
            <div className="mt-auto border-t p-3">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Logout
              </button>
              <div className="text-xs text-gray-500 mt-3">
                &copy; {new Date().getFullYear()} Amar Rokto
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
