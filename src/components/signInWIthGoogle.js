import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import googleLogo from "../google.png";
import { useNavigate } from "react-router-dom";

export default function SignInwithGoogle() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;

      // Ensure user has a document and default role
      const userRef = doc(db, "Users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email || "",
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          photo: user.photoURL || "",
          createdAt: new Date(),
          role: "user",
          bloodGroup: "",
          age: "",
          gender: "",
          city: "",
          eligibility: { passed: false, lastCheckedAt: null },
        });
      }

      // If they’re a blood bank (registered with same UID), route to inventory
      const bbSnap = await getDoc(doc(db, "BloodBanks", user.uid));
      if (bbSnap.exists()) {
        navigate(`/bloodbank/edit/${user.uid}`);
      } else if (user.email === "admin@gmail.com") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      alert("Google sign-in failed. Please try again.");
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded py-2 hover:bg-gray-50 transition"
      type="button"
    >
      <img src={googleLogo} alt="Google" className="w-5 h-5" />
      <span className="font-medium">Sign in with Google</span>
    </button>
  );
}
