// src/components/register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import logo from "../logo.png"; // ✅ same PNG as on login

const ALL_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

export default function Register() {
  const navigate = useNavigate();

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
          bloodGroups: groups,         // supported groups
          bloodStock: {},              // start empty; you can edit later
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        {/* ✅ Logo (slightly bigger than login) */}
        <div className="flex items-center justify-center mb-3">
          <img
            src={logo}
            alt="Amar Rokto"
            className="h-20 w-20 rounded-full object-contain shadow-sm"
          />
        </div>

        <h1 className="text-2xl font-bold text-red-600 mb-4 text-center">
          Create an Account
        </h1>

        {err && (
          <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Role selector (full width on mobile) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Register as</label>
            <div className="flex gap-3">
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
            <label className="block text-sm font-medium mb-1">
              {role === "bloodbank" ? "Blood Bank Name" : "Your Name"}
            </label>
            <input
              className="input w-full"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "bloodbank" ? "e.g., Quantum Blood Bank" : "e.g., John Doe"}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              className="input w-full"
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
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    className="input w-full"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, Area"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    className="input w-full"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Dhaka"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <input
                    className="input w-full"
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website (optional)</label>
                  <input
                    className="input w-full"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Supported Blood Groups
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_GROUPS.map((g) => (
                    <label key={g} className="inline-flex items-center gap-2">
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
                <label className="block text-sm font-medium mb-1">
                  Notes / Description (optional)
                </label>
                <textarea
                  className="input w-full"
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
              className="w-full bg-red-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </div>
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
