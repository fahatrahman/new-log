// src/components/register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      // Optional profile displayName
      if (form.name.trim()) {
        await updateProfile(user, { displayName: form.name.trim() });
      }

      // Create user doc (your app expects Users collection)
      await setDoc(doc(db, "Users", user.uid), {
        name: form.name.trim() || "",
        email: form.email.trim(),
        role: "user",
        createdAt: new Date().toISOString(),
      });

      navigate("/home");
    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Register</h1>

        {err && (
          <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              className="input w-full"
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="input w-full"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              className="input w-full"
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-right text-gray-600">
          Already registered?{" "}
          <Link to="/login" className="text-red-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
