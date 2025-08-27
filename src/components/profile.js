// src/components/profile.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export default function Profile() {
  const auth = getAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    city: "",
    bloodGroup: "",
    photo: "",
  });

  // Load profile from Firestore
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "Users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserDetails(data);
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            age: data.age || "",
            gender: data.gender || "",
            city: data.city || "",
            bloodGroup: data.bloodGroup || "",
            photo: data.photo || "",
          });
        }
      } catch (e) {
        console.error("Profile load error:", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await updateDoc(doc(db, "Users", u.uid), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      setUserDetails((p) => ({ ...p, ...formData }));
      setIsEditing(false);
    } catch (e) {
      console.error("Update profile error:", e);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!userDetails) return <p className="p-6">No profile found.</p>;

  const lastLogin =
    userDetails.lastLogin?.seconds
      ? new Date(userDetails.lastLogin.seconds * 1000).toLocaleString()
      : userDetails.lastLogin || "";

  const displayName =
    (userDetails.firstName || "").trim() ||
    (getAuth().currentUser?.displayName || "User");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex items-start sm:items-center justify-center px-4 pt-10 pb-12">
      <div className="w-full max-w-3xl space-y-5">

        {/* Header card — full, not cropped */}
        <div className="rounded-2xl border border-gray-800 shadow bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={userDetails.photo || "https://via.placeholder.com/150?text=User"}
                alt={displayName}
                className="h-20 w-20 rounded-full border-4 border-gray-900 shadow-lg object-cover bg-gray-800"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold leading-tight">{displayName}</h2>
                <p className="text-sm text-gray-400">{userDetails.email}</p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-gray-900 font-semibold hover:bg-emerald-400"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details / Edit form */}
        <div className="bg-gray-900 rounded-2xl shadow border border-gray-800">
          <div className="px-6 py-4 border-b border-gray-800">
            <h3 className="font-semibold">Personal details</h3>
          </div>

          {!isEditing ? (
            <div className="px-6 py-4">
              <dl className="divide-y divide-gray-800">
                <Row label="Full name" value={`${userDetails.firstName || "-"} ${userDetails.lastName || ""}`.trim()} />
                <Row label="Age" value={userDetails.age || "Not set"} />
                <Row label="Gender" value={userDetails.gender || "Not set"} />
                <Row label="City" value={userDetails.city || "Not set"} />
                <Row label="Blood Group" value={userDetails.bloodGroup || "Not set"} />
                {lastLogin ? <Row label="Last Login" value={lastLogin} /> : null}
              </dl>
            </div>
          ) : (
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </Field>

              <Field label="Last name">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                  name="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </Field>

              <Field label="Age">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                  name="age"
                  type="number"
                  min="0"
                  placeholder="Age"
                  value={formData.age}
                  onChange={handleInputChange}
                />
              </Field>

              <Field label="Gender">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>

              <Field label="City">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </Field>

              <Field label="Blood Group">
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                >
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>

              <Field label="Photo URL" span={2}>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-red-400"
                  name="photo"
                  placeholder="https://…"
                  value={formData.photo}
                  onChange={handleInputChange}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Themed action buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link
            to="/home"
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
          >
            Home
          </Link>
          <Link
            to="/donor-dashboard"
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
          >
            View My Donation Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

/* Helpers */
function Row({ label, value }) {
  return (
    <div className="py-3 grid grid-cols-3 gap-4">
      <dt className="text-sm text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-100 col-span-2">{value}</dd>
    </div>
  );
}

function Field({ label, children, span = 1 }) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : ""}>
      <label className="block text-sm mb-1 text-gray-400">{label}</label>
      {children}
    </div>
  );
}
