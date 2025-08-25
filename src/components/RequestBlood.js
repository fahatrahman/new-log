import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

export default function RequestBlood() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    bloodBankId: "",
    requesterName: user?.displayName || "",
    contactNumber: "",
    bloodGroup: "",
    units: 1,
    date: "",
    additionalInfo: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "BloodBanks"));
        setBanks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

    const { bloodBankId, requesterName, contactNumber, bloodGroup, units, date } = form;
    if (!bloodBankId || !requesterName.trim() || !contactNumber.trim() || !bloodGroup || !date || Number(units) <= 0) {
      setFormError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "blood_requests"), {
        ...form,
        userId: user?.uid || null,
        units: Number(units),
        status: "pending",
        timestamp: serverTimestamp(),
      });
      setFormSuccess("Blood request submitted!");
      setForm({
        bloodBankId: "",
        requesterName: user?.displayName || "",
        contactNumber: "",
        bloodGroup: "",
        units: 1,
        date: "",
        additionalInfo: "",
      });
    } catch (e) {
      console.error("submit error:", e);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Request Blood</h2>
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
            {banks.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} — {(b.address || b.location || "Location N/A")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-semibold">Full Name *</span>
          <input name="requesterName" value={form.requesterName} onChange={handle} className="input" required />
        </label>

        <label className="block">
          <span className="font-semibold">Contact Number *</span>
          <input name="contactNumber" value={form.contactNumber} onChange={handle} className="input" placeholder="+8801XXXXXXXXX" required />
        </label>

        <label className="block">
          <span className="font-semibold">Blood Group *</span>
          <select name="bloodGroup" value={form.bloodGroup} onChange={handle} className="input" required>
            <option value="">Select blood group</option>
            {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="font-semibold">Units *</span>
          <input type="number" min={1} name="units" value={form.units} onChange={handle} className="input" required />
        </label>

        <label className="block">
          <span className="font-semibold">Required Date *</span>
          <input type="date" name="date" value={form.date} onChange={handle} className="input" required />
        </label>

        <label className="block">
          <span className="font-semibold">Additional Info (optional)</span>
          <textarea name="additionalInfo" value={form.additionalInfo} onChange={handle} className="input" rows={3} />
        </label>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
