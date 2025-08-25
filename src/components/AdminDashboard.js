import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    bloodBanks: 0,
    donations: 0,
    requests: 0,
    pendingDonations: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, banks, donations, requests, pd, pr] = await Promise.all([
          getDocs(collection(db, "Users")),
          getDocs(collection(db, "BloodBanks")),
          getDocs(collection(db, "donation_schedules")),
          getDocs(collection(db, "blood_requests")),
          getDocs(query(collection(db, "donation_schedules"), where("status", "in", ["pending", null]))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "blood_requests"), where("status", "in", ["pending", null]))).catch(() => ({ docs: [] })),
        ]);

        setStats({
          users: users.docs.length,
          bloodBanks: banks.docs.length,
          donations: donations.docs.length,
          requests: requests.docs.length,
          pendingDonations: pd.docs.length,
          pendingRequests: pr.docs.length,
        });
      } catch (e) {
        console.error("admin stats error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;

  const Card = ({ title, value, accent = "bg-red-600" }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${accent === "bg-red-600" ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Total Users" value={stats.users} />
        <Card title="Blood Banks" value={stats.bloodBanks} />
        <Card title="Total Donations" value={stats.donations} />
        <Card title="Total Requests" value={stats.requests} />
        <Card title="Pending Donations" value={stats.pendingDonations} />
        <Card title="Pending Requests" value={stats.pendingRequests} />
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Notes</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li>Use Firestore Security Rules to restrict sensitive writes to admins only.</li>
          <li>Consider adding composite indexes if queries slow down at scale.</li>
          <li>Extend with charts (donations per month, most requested blood types) when ready.</li>
        </ul>
      </div>
    </div>
  );
}
