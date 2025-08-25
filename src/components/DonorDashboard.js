// src/components/DonorDashboard.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";
import DonorBadges from "./DonorBadges";

export default function DonorDashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [donations, setDonations] = useState([]);
  const [bankNames, setBankNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "donation_schedules"), where("userId", "==", user?.uid || ""));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Latest first
        rows.sort((a,b) => {
          const at = (a.timestamp?.seconds || a.date?.seconds || 0);
          const bt = (b.timestamp?.seconds || b.date?.seconds || 0);
          return bt - at;
        });
        setDonations(rows);

        const ids = [...new Set(rows.map(r => r.bloodBankId).filter(Boolean))];
        const map = {};
        await Promise.all(ids.map(async (id) => {
          const s = await getDoc(doc(db, "BloodBanks", id));
          map[id] = s.exists() ? (s.data().name || id) : id;
        }));
        setBankNames(map);
      } catch (e) {
        console.error("load donations:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Compute badge inputs
  const approved = donations.filter(d => (d.status || "pending").toLowerCase() === "approved");
  const donationCount = approved.length;

  // Latest approved donation date (for eligibility)
  let lastApprovedAt = null;
  for (const d of approved) {
    let dt = null;
    if (typeof d.date === "string") {
      const parsed = new Date(d.date);
      if (!isNaN(parsed.getTime())) dt = parsed;
    } else if (d.date?.seconds) {
      dt = new Date(d.date.seconds * 1000);
    } else if (d.timestamp?.seconds) {
      dt = new Date(d.timestamp.seconds * 1000);
    }
    if (dt && (!lastApprovedAt || dt > lastApprovedAt)) lastApprovedAt = dt;
  }

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Badges & eligibility summary */}
      <DonorBadges count={donationCount} lastApprovedAt={lastApprovedAt} />

      <h1 className="text-2xl font-bold mb-3">My Donation History</h1>
      {donations.length === 0 ? (
        <p>You haven’t scheduled any donations yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Blood Bank</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-2">{bankNames[d.bloodBankId] || d.bloodBankId || "-"}</td>
                  <td className="p-2">
                    {typeof d.date === "string"
                      ? d.date
                      : d.date?.seconds ? new Date(d.date.seconds * 1000).toLocaleDateString()
                      : d.timestamp?.seconds ? new Date(d.timestamp.seconds * 1000).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-2">{d.time || "-"}</td>
                  <td className="p-2 capitalize">{(d.status || "pending")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
