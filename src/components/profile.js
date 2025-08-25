// src/components/profile.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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
      await signOut(auth);
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
    (auth.currentUser?.displayName || "User");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Picture & Name */}
        <div className="flex justify-center">
          <img
            src={
              userDetails.photo ||
              "https://via.placeholder.com/150?text=User"
            }
            alt={displayName}
            width="150"
            height="150"
            className="rounded-full border-4 border-red-600 shadow"
          />
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-center">{displayName}</h3>

        {/* Details / Edit form */}
        {!isEditing ? (
          <div className="bg-white p-4 rounded shadow mt-4 space-y-1">
            <p><strong>Email:</strong> {userDetails.email}</p>
            <p><strong>First Name:</strong> {userDetails.firstName || "Not set"}</p>
            <p><strong>Age:</strong> {userDetails.age || "Not set"}</p>
            <p><strong>Blood Group:</strong> {userDetails.bloodGroup || "Not set"}</p>
            <p><strong>Gender:</strong> {userDetails.gender || "Not set"}</p>
            <p><strong>City:</strong> {userDetails.city || "Not set"}</p>
            {lastLogin && <p><strong>Last Login:</strong> {lastLogin}</p>}
          </div>
        ) : (
          <div className="bg-white p-4 rounded shadow mt-4 grid grid-cols-1 gap-3">
            <input
              className="input"
              name="firstName"
              placeholder="First name"
              value={formData.firstName}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="lastName"
              placeholder="Last name"
              value={formData.lastName}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="age"
              type="number"
              placeholder="Age"
              value={formData.age}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="bloodGroup"
              placeholder="Blood Group (e.g., A+)"
              value={formData.bloodGroup}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="gender"
              placeholder="Gender"
              value={formData.gender}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleInputChange}
            />
            <input
              className="input"
              name="photo"
              placeholder="Photo URL"
              value={formData.photo}
              onChange={handleInputChange}
            />
            <div className="flex gap-3 justify-end">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center mt-5 flex-wrap">
          <Link
            to="/home"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Home
          </Link>

          {/* NEW: Donor Dashboard link */}
          <Link
            to="/donor-dashboard"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            View My Donation Dashboard
          </Link>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Edit
            </button>
          ) : null}

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
