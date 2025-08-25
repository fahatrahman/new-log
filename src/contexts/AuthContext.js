// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


const AuthContext = createContext();


export function AuthProvider({ children }) {
const [user, setUser] = useState(null);
const [role, setRole] = useState(null); // "user", "bloodbank", or "admin"
const [loading, setLoading] = useState(true);


useEffect(() => {
const unsub = onAuthStateChanged(auth, async (u) => {
setUser(u);
setRole(null);
if (u) {
try {
// First, check Users collection
const userDoc = await getDoc(doc(db, "Users", u.uid));
if (userDoc.exists()) {
const data = userDoc.data();
setRole(data.role || "user");
} else {
// Then, check BloodBanks collection
const bbDoc = await getDoc(doc(db, "BloodBanks", u.uid));
if (bbDoc.exists()) {
const data = bbDoc.data();
setRole(data.role || "bloodbank");
} else if (u.email === "admin@gmail.com") {
// Admin fallback (better: manage in Firestore claims)
setRole("admin");
} else {
setRole("user");
}
}
} catch (err) {
console.error("Error fetching role:", err);
setRole(null);
}
} else {
setRole(null);
}
setLoading(false);
});


return () => unsub();
}, []);


return (
<AuthContext.Provider value={{ user, role, loading }}>
{children}
</AuthContext.Provider>
);
}


export function useAuth() {
return useContext(AuthContext);
}