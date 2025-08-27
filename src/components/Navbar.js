// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

// Optional: keep if you have a bell component
import NotificationBell from "./NotificationBell";

// Your PNG logo lives in src/logo.png
import logo from "../logo.png";

/** Resolve the inventory edit URL for a bank user */
async function resolveInventoryHref(uid) {
  // 👉 Change the path below if your inventory route is different
  const EDIT_PATH = (bankId) => `/bloodbank/${bankId}/edit`;

  // Try BloodBanks/{uid} directly
  const direct = await getDoc(doc(db, "BloodBanks", uid));
  if (direct.exists()) return EDIT_PATH(uid);

  // Fallback: find bank doc where uid == user.uid
  const q = query(
    collection(db, "BloodBanks"),
    where("uid", "==", uid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return EDIT_PATH(snap.docs[0].id);

  return null;
}

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isBankUser, setIsBankUser] = useState(false);
  const [inventoryHref, setInventoryHref] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setIsBankUser(false);
      setInventoryHref(null);

      if (!u) return;

      try {
        // read the user role
        const uSnap = await getDoc(doc(db, "Users", u.uid));
        const role = uSnap.exists() ? (uSnap.data().role || "user") : "user";
        const bankRoles = ["bloodbank", "bank", "adminBank"];

        const isBank = bankRoles.includes(role);
        setIsBankUser(isBank);

        if (isBank) {
          const href = await resolveInventoryHref(u.uid);
          if (href) setInventoryHref(href);
        }
      } catch (e) {
        console.warn("Navbar role / inventory detection failed:", e);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setOpen(false);
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const linkCls =
    "block w-full text-left px-4 py-2 rounded hover:bg-gray-100 transition";

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-red-600 text-white shadow">
        <div className="max-w-6xl mx-auto px-3 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Amar Rokto"
              className="h-6 w-6 rounded-full object-contain"
            />
            <span className="font-semibold tracking-wide">Amar Rokto</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Notification bell (optional) */}
            <NotificationBell />

            {/* Hamburger */}
            <button
              className="inline-flex items-center justify-center w-9 h-9 rounded hover:bg-white/10"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Side drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer panel */}
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="h-14 px-4 border-b flex items-center gap-2">
              <img
                src={logo}
                alt="Amar Rokto"
                className="h-7 w-7 rounded-full object-contain"
              />
              <span className="font-semibold">Amar Rokto</span>
              <button
                className="ml-auto w-8 h-8 rounded hover:bg-gray-100 grid place-items-center"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Links */}
            <nav className="p-3 flex-1">
              <ul className="space-y-1">
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `${linkCls} ${isActive ? "bg-gray-100" : ""}`
                    }
                    onClick={() => setOpen(false)}
                  >
                    Home
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    to="/bank-dashboard"
                    className={({ isActive }) =>
                      `${linkCls} ${isActive ? "bg-gray-100" : ""}`
                    }
                    onClick={() => setOpen(false)}
                  >
                    Bank Dashboard
                  </NavLink>
                </li>

                {/* Inventory appears only for blood-bank users */}
                {isBankUser && inventoryHref && (
                  <li>
                    <NavLink
                      to={inventoryHref}
                      className={({ isActive }) =>
                        `${linkCls} ${isActive ? "bg-gray-100" : ""}`
                      }
                      onClick={() => setOpen(false)}
                      title="Manage stock & requests"
                    >
                      Inventory
                    </NavLink>
                  </li>
                )}

                <li>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      `${linkCls} ${isActive ? "bg-gray-100" : ""}`
                    }
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Footer (Logout) */}
            <div className="p-3 border-t">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white font-semibold rounded px-3 py-2 hover:bg-red-700"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="w-full inline-block text-center bg-red-600 text-white font-semibold rounded px-3 py-2 hover:bg-red-700"
                >
                  Login
                </Link>
              )}
              <div className="text-[11px] text-gray-500 mt-2">
                © {new Date().getFullYear()} Amar Rokto
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
