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
    role: "user", // "user" | "bloodbank"
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
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const user = cred.user;

      if (form.name.trim()) {
        await updateProfile(user, { displayName: form.name.trim() });
      }

      // Users doc
      await setDoc(doc(db, "Users", user.uid), {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        createdAt: new Date().toISOString(),
      });

      // If blood bank, also create bank doc then go straight to editor
      if (form.role === "bloodbank") {
        await setDoc(doc(db, "BloodBanks", user.uid), {
          name: form.name.trim() || "Blood Bank",
          email: form.email.trim(),
          address: "",
          city: "",
          contact: "",
          bloodGroup: [],      // old schema key kept for compatibility
          bloodGroups: [],     // new schema key also present (harmless)
          bloodStock: {},
          createdAt: new Date().toISOString(),
        });
        navigate(`/bloodbank/edit/${user.uid}`);
      } else {
        navigate("/home");
      }
    } catch (e) {
      setErr(e?.message || "Registration failed");
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
            <label className="block text-sm font-medium mb-1">
              {form.role === "bloodbank" ? "Blood Bank Name" : "Name"}
            </label>
            <input
              className="input w-full"
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder={
                form.role === "bloodbank"
                  ? "e.g., Quantum Blood Bank"
                  : "Your name"
              }
              required
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

          <div>
            <label className="block text-sm font-medium mb-1">Register as</label>
            <select
              name="role"
              value={form.role}
              onChange={onChange}
              className="input w-full"
            >
              <option value="user">User</option>
              <option value="bloodbank">Blood Bank</option>
            </select>
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
