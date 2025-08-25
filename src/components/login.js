import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import SignInwithGoogle from "./signInWIthGoogle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      if (user) {
        // redirect based on collections
        const bbSnap = await getDoc(doc(db, "BloodBanks", user.uid));
        if (bbSnap.exists()) {
          navigate(`/bloodbank/edit/${user.uid}`);
        } else if (user.email === "admin@gmail.com") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      }
      toast.success("Logged in successfully", { position: "top-center" });
    } catch (error) {
      toast.error(error.message, { position: "bottom-center" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h3 className="text-2xl font-semibold mb-6 text-center text-red-600">Login</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter email"
            className="input"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter password"
            className="input"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-right text-gray-600">
          New user?{" "}
          <a href="/register" className="text-red-600 hover:underline">
            Register Here
          </a>
        </p>
        <div className="mt-6">
          <SignInwithGoogle />
        </div>
      </div>
    </div>
  );
}
