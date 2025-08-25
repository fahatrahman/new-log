// src/components/ScheduleDonation.js
import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ScheduleDonation() {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  // ---------- ELIGIBILITY GUARD ----------
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "Users", user.uid));
        const passed = snap.data()?.eligibility?.passed;
        if (passed === false || passed === undefined) {
          alert("Please complete the eligibility check before scheduling a donation.");
          navigate("/eligibility");
        }
      } catch (e) {
        console.error("eligibility check error:", e);
      }
    })();
  }, [user, navigate]);
  // ---------------------------------------

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    bloodBankId: "",
    donorName: user?.displayName || "",
    contactNumber: "",
    date: "",
    time: "",
    additionalInfo: "",
    bloodGroup: "", // optional
  });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        setBanks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error loading banks:", e);
      }
    })();
  }, []);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const { bloodBankId, donorName, contactNumber, date, time } = form;
    if (!bloodBankId || !donorName.trim() || !contactNumber.trim() || !date || !time) {
      setFormError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "donation_schedules"), {
        ...form,
        userId: user?.uid || null,
        status: "pending",
        timestamp: serverTimestamp(),
      });
      setFormSuccess("Donation scheduled!");
      setForm({
        bloodBankId: "",
        donorName: user?.displayName || "",
        contactNumber: "",
        date: "",
        time: "",
        additionalInfo: "",
        bloodGroup: "",
      });
    } catch (e) {
      console.error("submit error:", e);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bloodGroups = ["", "A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Schedule Donation</h2>
      {formError && <p className="text-red-600 mb-2">{formError}</p>}
      {formSuccess && <p className="text-green-600 mb-2">{formSuccess}</p>}

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="font-semibold">Select Blood Bank *</span>
          <select
            name="bloodBankId"
            value={form.bloodBankId}
            onChange={handle}
            className="input"
            required
          >
            <option value="">Choose a blood bank</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address || b.location || "Location N/A"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-semibold">Full Name *</span>
          <input
            name="donorName"
            value={form.donorName}
            onChange={handle}
            className="input"
            required
          />
        </label>

        <label className="block">
          <span className="font-semibold">Contact Number *</span>
          <input
            name="contactNumber"
            value={form.contactNumber}
            onChange={handle}
            className="input"
            placeholder="+8801XXXXXXXXX"
            required
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="font-semibold">Donation Date *</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handle}
              className="input"
              required
            />
          </label>
          <label className="block">
            <span className="font-semibold">Donation Time *</span>
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handle}
              className="input"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold">Blood Group (optional)</span>
          <select
            name="bloodGroup"
            value={form.bloodGroup}
            onChange={handle}
            className="input"
          >
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg}>
                {bg === "" ? "Select blood group" : bg}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-semibold">Additional Info</span>
          <textarea
            name="additionalInfo"
            value={form.additionalInfo}
            onChange={handle}
            className="input"
            rows={3}
          />
        </label>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Scheduling..." : "Schedule Donation"}
        </button>
      </form>
    </div>
  );
}
