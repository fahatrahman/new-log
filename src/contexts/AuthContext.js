// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../components/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "user" | "bloodbank" | "admin"
  const [bankId, setBankId] = useState(null); // resolved BloodBank doc id (if any)
  const [userData, setUserData] = useState(null); // Users/{uid} data
  const [bankData, setBankData] = useState(null); // BloodBanks/{bankId} data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAuth = null;
    let unsubUserDoc = null;
    let unsubBankDoc = null;

    const cleanup = () => {
      if (unsubUserDoc) unsubUserDoc();
      if (unsubBankDoc) unsubBankDoc();
    };

    unsubAuth = onAuthStateChanged(auth, async (u) => {
      // reset state on user change
      cleanup();
      setUser(u);
      setRole(null);
      setBankId(null);
      setUserData(null);
      setBankData(null);

      if (!u) {
        setLoading(false);
        return;
      }

      let adminClaim = false;
      try {
        const token = await getIdTokenResult(u, true);
        if (token?.claims?.admin) adminClaim = true;
      } catch {
        // ignore
      }
      // Email fallback (optional; remove if you rely on claims only)
      if (!adminClaim && u.email === "admin@gmail.com") adminClaim = true;

      // Subscribe to Users/{uid} if it exists
      const uRef = doc(db, "Users", u.uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        unsubUserDoc = onSnapshot(uRef, (snap) => {
          const data = snap.data() || {};
          setUserData(data);
          // Prefer explicit role on the Users doc; otherwise admin or "user"
          setRole(data.role || (adminClaim ? "admin" : "user"));
        });
      }

      // Resolve bank doc (id == uid or search by uid field)
      let resolvedBankId = null;

      // Try by id == uid
      const bankIdRef = doc(db, "BloodBanks", u.uid);
      const bankIdSnap = await getDoc(bankIdRef);
      if (bankIdSnap.exists()) {
        resolvedBankId = u.uid;
      } else {
        // Try by uid field
        const q = query(
          collection(db, "BloodBanks"),
          where("uid", "==", u.uid),
          limit(1)
        );
        const qs = await getDocs(q);
        if (!qs.empty) {
          resolvedBankId = qs.docs[0].id;
        }
      }

      if (resolvedBankId) {
        setBankId(resolvedBankId);
        const bRef = doc(db, "BloodBanks", resolvedBankId);
        unsubBankDoc = onSnapshot(bRef, (snap) => {
          const data = snap.data() || {};
          setBankData(data);
          // If we didn't already set a non-bank role, default to bloodbank
          // (i.e., if there was no Users doc to define role)
          if (!uSnap.exists()) {
            setRole(data.role || "bloodbank");
          }
        });
      }

      if (adminClaim) {
        setRole("admin");
      }

      setLoading(false);
    });

    return () => {
      cleanup();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      // extras for convenience
      bankId,
      userData,
      bankData,
      isAdmin: role === "admin",
      isBank: role === "bloodbank",
      isUser: role === "user" || !role,
    }),
    [user, role, loading, bankId, userData, bankData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
