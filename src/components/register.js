// src/components/register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import logo from "../logo.png"; // your PNG logo in /src

// Left-side hero image is served from /public
const heroImg = process.env.PUBLIC_URL + "/register.jpg";

const ALL_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

export default function Register() {
  const navigate = useNavigate();

  // ----- original state/logic (unchanged) -----
  const [role, setRole] = useState("user"); // "user" | "bloodbank"
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // shared
  const [name, setName] = useState(""); // user name or blood bank name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // blood bank–specific
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [groups, setGroups] = useState([]); // array of blood groups
  const [notes, setNotes] = useState("");

  const toggleGroup = (g) =>
    setGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (role === "bloodbank") {
      if (!address.trim() || !city.trim() || !contact.trim()) {
        return setErr("Please provide address, city, and contact phone.");
      }
      if (groups.length === 0) {
        return setErr("Select at least one supported blood group.");
      }
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (name.trim()) {
        await updateProfile(user, { displayName: name.trim() });
      }

      // Users doc (everyone)
      await setDoc(doc(db, "Users", user.uid), {
        name: name.trim(),
        email: email.trim(),
        role,
        city: role === "bloodbank" ? city.trim() : null,
        createdAt: new Date().toISOString(),
      });

      if (role === "bloodbank") {
        // BloodBanks doc (extra info)
        await setDoc(doc(db, "BloodBanks", user.uid), {
          name: name.trim() || "Blood Bank",
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          contact: contact.trim(),
          website: website.trim() || "",
          bloodGroups: groups,
          bloodStock: {},
          description: notes.trim(),
          createdAt: new Date().toISOString(),
        });
        navigate(`/bloodbank/edit/${user.uid}`);
      } else {
        navigate("/home");
      }
    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  // -------------------------------------------

  return (
    <div className="min-h-screen grid place-items-center bg-[#312e3f]">
      <div className="w-full max-w-6xl bg-[#1f1c2b] text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <div className="grid md:grid-cols-2">
          {/* LEFT – hero image panel */}
          <div className="relative h-64 md:h-[680px]">
            <img
              src={heroImg}
              alt="Register hero"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Brand at top-left (no extra buttons) */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <img
                src={logo}
                alt="Amar Rokto"
                className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/90 p-1 shadow"
              />
              <span className="hidden md:inline text-sm font-semibold">
                Amar Rokto
              </span>
            </div>

            {/* Caption + faux progress (purely visual, not buttons) */}
            <div className="absolute left-6 right-6 bottom-8">
              <h3 className="text-xl md:text-2xl font-semibold">
                Get Started with Us
              </h3>
              <p className="text-sm text-white/70 mt-1">
                Complete these easy steps to register your account.
              </p>

              {/* The three “steps” shown as non-interactive badges (not buttons) */}
              <div className="mt-4 space-y-2 max-w-xs">
                <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm">
                  <span className="inline-block rounded-full bg-white text-black text-xs px-2 py-0.5 mr-2">
                    1
                  </span>
                  Sign up your account
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
                  <span className="inline-block rounded-full bg-white/70 text-black text-xs px-2 py-0.5 mr-2">
                    2
                  </span>
                  Provide the necessary information
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
                  <span className="inline-block rounded-full bg-white/70 text-black text-xs px-2 py-0.5 mr-2">
                    3
                  </span>
                  Set up your profile
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT – form panel (all your logic preserved) */}
          <div className="px-6 md:px-10 py-8 md:py-10">
            {/* Logo above heading (slightly bigger than login) */}
            <div className="flex items-center justify-center mb-3">
              <img
                src={logo}
                alt="Amar Rokto"
                className="h-16 w-16 rounded-full bg-white p-1 shadow"
              />
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-center">
              Sign Up Account
            </h1>
            <p className="mt-2 text-sm text-white/70 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-violet-400 hover:underline">
                Log in
              </Link>
            </p>

            {err && (
              <div className="mt-4 text-sm text-red-200 bg-red-900/40 border border-red-700/50 rounded-md p-3">
                {err}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role selector */}
              <div className="md:col-span-2">
                <label className="block text-xs mb-2 text-white/70">Register as</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={role === "user"}
                      onChange={() => setRole("user")}
                    />
                    <span>User</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      value="bloodbank"
                      checked={role === "bloodbank"}
                      onChange={() => setRole("bloodbank")}
                    />
                    <span>Blood Bank</span>
                  </label>
                </div>
              </div>

              {/* Shared fields */}
              <div className="md:col-span-1">
                <label className="block text-xs mb-1 text-white/70">
                  {role === "bloodbank" ? "Blood Bank Name" : "Your Name"}
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "bloodbank" ? "e.g., Quantum Blood Bank" : "e.g., John Doe"}
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs mb-1 text-white/70">Email</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs mb-1 text-white/70">Password</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              {/* Blood bank details (conditionally shown) */}
              {role === "bloodbank" && (
                <>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1 text-white/70">Address</label>
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, Area"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-white/70">City</label>
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g., Dhaka"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-white/70">Contact Phone</label>
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                        type="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="+8801XXXXXXXXX"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-white/70">Website (optional)</label>
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs mb-2 text-white/70">Supported Blood Groups</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ALL_GROUPS.map((g) => (
                        <label key={g} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={groups.includes(g)}
                            onChange={() => toggleGroup(g)}
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs mb-1 text-white/70">
                      Notes / Description (optional)
                    </label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-violet-400"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Hours, services, directions, etc."
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 transition font-semibold py-2.5 disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
