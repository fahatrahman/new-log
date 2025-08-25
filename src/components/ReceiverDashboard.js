import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

export default function ReceiverDashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [requests, setRequests] = useState([]);
  const [bankNames, setBankNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "blood_requests"), where("userId", "==", user?.uid || ""));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rows.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)).reverse();
        setRequests(rows);

        const ids = [...new Set(rows.map(r => r.bloodBankId).filter(Boolean))];
        const map = {};
        await Promise.all(ids.map(async (id) => {
          const s = await getDoc(doc(db, "BloodBanks", id));
          map[id] = s.exists() ? (s.data().name || id) : id;
        }));
        setBankNames(map);
      } catch (e) {
        console.error("load requests:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Blood Requests</h1>
      {requests.length === 0 ? (
        <p>You have no requests yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Blood Bank</th>
                <th className="p-2 text-left">Blood Group</th>
                <th className="p-2 text-left">Units</th>
                <th className="p-2 text-left">Required Date</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{bankNames[r.bloodBankId] || r.bloodBankId || "-"}</td>
                  <td className="p-2">{r.bloodGroup || "-"}</td>
                  <td className="p-2">{r.units || "-"}</td>
                  <td className="p-2">
                    {typeof r.date === "string"
                      ? r.date
                      : r.date?.seconds ? new Date(r.date.seconds * 1000).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 capitalize">{(r.status || "pending")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}