// src/components/DonorDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";
import { Link } from "react-router-dom";
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
        const q = query(
          collection(db, "donation_schedules"),
          where("userId", "==", user?.uid || "")
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // latest first
        rows.sort((a, b) => {
          const at = a.timestamp?.seconds || a.date?.seconds || 0;
          const bt = b.timestamp?.seconds || b.date?.seconds || 0;
          return bt - at;
        });
        setDonations(rows);

        // load bank names
        const ids = [...new Set(rows.map((r) => r.bloodBankId).filter(Boolean))];
        const map = {};
        await Promise.all(
          ids.map(async (id) => {
            const s = await getDoc(doc(db, "BloodBanks", id));
            map[id] = s.exists() ? s.data().name || id : id;
          })
        );
        setBankNames(map);
      } catch (e) {
        console.error("load donations:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ---------- helpers ----------
  const parseDate = (r) => {
    if (typeof r?.date === "string") {
      const p = new Date(r.date);
      return isNaN(p.getTime()) ? null : p;
    }
    if (r?.date?.seconds) return new Date(r.date.seconds * 1000);
    if (r?.timestamp?.seconds) return new Date(r.timestamp.seconds * 1000);
    return null;
  };

  const statusLabel = (s) => (s || "pending").toLowerCase();

  const chip = (s) => {
    const t = statusLabel(s);
    if (t === "approved")
      return "bg-green-100 text-green-700 border border-green-200";
    if (t === "rejected" || t === "cancelled")
      return "bg-red-100 text-red-700 border border-red-200";
    return "bg-amber-100 text-amber-800 border border-amber-200";
  };

  // ---------- metrics / badges ----------
  const approved = useMemo(
    () => donations.filter((d) => statusLabel(d.status) === "approved"),
    [donations]
  );

  const pending = useMemo(
    () =>
      donations.filter((d) => {
        const t = statusLabel(d.status);
        return t !== "approved" && t !== "rejected" && t !== "cancelled";
      }),
    [donations]
  );

  const donationCount = approved.length;

  let lastApprovedAt = null;
  for (const d of approved) {
    const dt = parseDate(d);
    if (dt && (!lastApprovedAt || dt > lastApprovedAt)) lastApprovedAt = dt;
  }

  const now = new Date();
  const nextUpcoming =
    donations
      .map((d) => ({ row: d, when: parseDate(d) }))
      .filter((x) => x.when && x.when > now)
      .sort((a, b) => a.when - b.when)[0] || null;

  if (loading) return <p className="p-6">Loading...</p>;

  // small metric card component with red/white variants
  const MetricCard = ({ label, value, variant = "white" }) => {
    const isRed = variant === "red";
    return (
      <div
        className={
          `rounded-2xl p-4 shadow-lg ` +
          (isRed
            ? "bg-red-600 text-white"
            : "bg-white text-gray-900 border border-red-100")
        }
      >
        <div className={`text-xs uppercase ${isRed ? "text-red-100/80" : "text-gray-500"}`}>
          {label}
        </div>
        <div className={`mt-2 ${isRed ? "text-3xl font-extrabold" : "text-3xl font-extrabold text-red-700"}`}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <div
      className="px-4 py-6 max-w-6xl mx-auto"
      style={{ fontFamily: "var(--brand-font, system-ui, -apple-system)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-red-700">Donor Dashboard</h1>
          <p className="text-sm text-gray-500">Your activity and donation history</p>
        </div>
        <Link
          to="/schedule-donation"
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
        >
          Schedule Donation
        </Link>
      </div>

      {/* Badges */}
      <div className="mb-6 bg-white rounded-2xl border border-red-100 shadow-lg">
        <div className="px-4 pt-4">
          <DonorBadges count={donationCount} lastApprovedAt={lastApprovedAt} />
        </div>
      </div>

      {/* Alternating metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Donations" value={donations.length} variant="white" />
        <MetricCard label="Approved" value={approved.length} variant="red" />
        <MetricCard label="Pending" value={pending.length} variant="white" />
        <MetricCard
          label="Last Approved"
          value={lastApprovedAt ? lastApprovedAt.toLocaleDateString() : "—"}
          variant="red"
        />
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-red-100 shadow-lg">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            </div>
            <ul className="divide-y">
              {donations.slice(0, 5).map((d) => {
                const when = parseDate(d);
                return (
                  <li key={d.id} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        statusLabel(d.status) === "approved"
                          ? "bg-green-500"
                          : statusLabel(d.status) === "rejected" ||
                            statusLabel(d.status) === "cancelled"
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {bankNames[d.bloodBankId] || d.bloodBankId || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {when ? when.toLocaleDateString() : "-"} • {d.time || "—"}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${chip(d.status)}`}>
                      {statusLabel(d.status)}
                    </span>
                  </li>
                );
              })}
              {donations.length === 0 && (
                <li className="px-4 py-6 text-sm text-gray-500">No donations yet.</li>
              )}
            </ul>

            {nextUpcoming && (
              <div className="px-4 py-3 border-t bg-red-50">
                <div className="text-xs uppercase text-red-700/80 font-semibold">
                  Next Upcoming
                </div>
                <div className="text-sm mt-1">
                  {bankNames[nextUpcoming.row.bloodBankId] ||
                    nextUpcoming.row.bloodBankId ||
                    "-"}
                </div>
                <div className="text-xs text-gray-600">
                  {nextUpcoming.when?.toLocaleDateString()} •{" "}
                  {nextUpcoming.row.time || "—"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-red-100 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Donation History</h2>
            </div>

            {donations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                You haven’t scheduled any donations yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50 text-red-700">
                    <tr>
                      <th className="p-3 text-left font-semibold">Blood Bank</th>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Time</th>
                      <th className="p-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => {
                      const when = parseDate(d);
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="p-3">
                            {bankNames[d.bloodBankId] || d.bloodBankId || "-"}
                          </td>
                          <td className="p-3">
                            {when ? when.toLocaleDateString() : "-"}
                          </td>
                          <td className="p-3">{d.time || "-"}</td>
                          <td className="p-3">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${chip(
                                d.status
                              )}`}
                            >
                              {statusLabel(d.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
