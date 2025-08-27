// src/components/login.js
import React, { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import brandLogo from "../logo.png"; // your logo in /src

// left-side hero image lives in /public
const heroImg = process.env.PUBLIC_URL + "/login.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // common redirect after any successful auth:
  const redirectAfterAuth = async (uid) => {
    try {
      const bbSnap = await getDoc(doc(db, "BloodBanks", uid));
      if (bbSnap.exists()) {
        navigate(`/bloodbank/edit/${uid}`);
      } else {
        navigate("/home");
      }
    } catch (e) {
      // if something goes wrong, at least take them home
      console.error("Post-login redirect error:", e);
      navigate("/home");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await redirectAfterAuth(cred.user.uid);
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    setErr("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await redirectAfterAuth(result.user.uid);
    } catch (e) {
      // user-closed popup or real error
      if (e?.code !== "auth/popup-closed-by-user") {
        setErr(e?.message || "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#312e3f]">
      {/* Card */}
      <div className="w-full max-w-6xl bg-[#1f1c2b] text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <div className="grid md:grid-cols-2">
          {/* Left: image panel */}
          <div className="relative h-64 md:h-[560px]">
            <img
              src={heroImg}
              alt="Blood donation"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Brand logo (top-left) */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <img
                src={brandLogo}
                alt="Amar Rokto"
                className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/90 p-1 shadow"
              />
              <span className="hidden md:inline text-sm font-semibold">Amar Rokto</span>
            </div>

            {/* Caption near bottom-left */}
            <div className="absolute left-6 right-6 bottom-8">
              <h3 className="text-lg md:text-xl font-semibold">
                Capturing Moments,
                <br /> Creating Memories
              </h3>
              <div className="mt-3 flex gap-2">
                <span className="h-1 w-8 rounded-full bg-white/40" />
                <span className="h-1 w-8 rounded-full bg-white/40" />
                <span className="h-1 w-8 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Right: form panel */}
          <div className="px-6 md:px-10 py-8 md:py-10">
            {/* Brand logo above form heading */}
            <div className="flex items-center justify-center mb-3">
              <img
                src={brandLogo}
                alt="Amar Rokto"
                className="h-10 w-10 rounded-full bg-white p-1 shadow"
              />
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-center">Welcome back</h1>
            <p className="mt-2 text-sm text-white/70 text-center">
              Don’t have an account?{" "}
              <Link to="/register" className="text-violet-400 hover:underline">
                Register
              </Link>
            </p>

            {err && (
              <div className="mt-4 text-sm text-red-200 bg-red-900/40 border border-red-700/50 rounded-md p-3">
                {err}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs mb-1 text-white/70">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-white/70">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 outline-none focus:border-violet-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/10"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    title={showPw ? "Hide password" : "Show password"}
                  >
                    {/* eye icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      {showPw ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 14.91 6.5 18.75 12 18.75c5.5 0 8.774-3.84 10.066-6.75a10.46 10.46 0 00-2.058-3.777M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      ) : (
                        <>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322C3.423 9.169 6.53 6.75 12 6.75c5.47 0 8.577 2.419 9.964 5.572M3 3l18 18"
                          />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 transition font-semibold py-2.5 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Create session"}
              </button>
            </form>

            {/* Single social button: Google only */}
            <div className="mt-6">
              <div className="relative text-center">
                <span className="px-2 text-xs text-white/60 bg-[#1f1c2b] relative z-10">
                  or continue with
                </span>
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={loading}
                  className="w-full rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-sm disabled:opacity-60"
                  title="Sign in with Google"
                >
                  Google
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
