// src/components/HomeInsights.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from "recharts";

const CHART_HEIGHT = 220;

const fmtDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (base, delta) => {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
};

// Parse date from docs that may store either string date OR Timestamp fields
const extractDate = (docData) => {
  if (docData?.timestamp?.seconds) return new Date(docData.timestamp.seconds * 1000);
  if (typeof docData?.date === "string") {
    const d = new Date(docData.date);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

export default function HomeInsights() {
  const [loading, setLoading] = useState(true);
  const [reqs, setReqs] = useState([]);
  const [dons, setDons] = useState([]);
  const [donorCount, setDonorCount] = useState(0);
  const [banksCount, setBanksCount] = useState(0);
  const [unitsDelivered30d, setUnitsDelivered30d] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const start14 = addDays(today, -13);
  const start30 = addDays(today, -29);

  useEffect(() => {
    (async () => {
      try {
        const ts30 = Timestamp.fromDate(start30);

        // -------- Counts --------

        // Donors = Users with role in ["user","donor"] (more resilient)
        const donorsQ = query(
          collection(db, "Users"),
          where("role", "in", ["user", "donor"])
        );
        const donorsCountSnap = await getCountFromServer(donorsQ);
        setDonorCount(donorsCountSnap.data().count);

        // Blood banks = count of docs in BloodBanks
        const banksCountSnap = await getCountFromServer(collection(db, "BloodBanks"));
        setBanksCount(banksCountSnap.data().count);

        // Requests in last 30 days (fetch by time only; filter status client-side)
        const qReq = query(
          collection(db, "blood_requests"),
          where("timestamp", ">=", ts30),
          orderBy("timestamp", "desc"),
          limit(500)
        );
        const reqSnap = await getDocs(qReq);
        const reqRows = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Donation schedules in last 30 days (for daily chart)
        const qDon = query(
          collection(db, "donation_schedules"),
          where("timestamp", ">=", ts30),
          orderBy("timestamp", "desc"),
          limit(500)
        );
        const donSnap = await getDocs(qDon);
        const donRows = donSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setReqs(reqRows);
        setDons(donRows);

        // Units delivered in 30d = sum of units for approved requests in range
        const delivered = reqRows.reduce((sum, r) => {
          const approved = (r.status || "").toLowerCase() === "approved";
          const dt = extractDate(r);
          if (!approved || !dt || dt < start30) return sum;
          const units = Number(r.units || 0);
          return sum + (isNaN(units) ? 0 : units);
        }, 0);
        setUnitsDelivered30d(delivered);
      } catch (e) {
        console.error("Insights load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [start30]);

  // ---------- Build chart data ----------

  // Per-day buckets for last 14 days
  const dayKeys = Array.from({ length: 14 }, (_, i) => fmtDateKey(addDays(start14, i)));
  const perDay = dayKeys.map((k) => ({ date: k, Requests: 0, Donations: 0 }));

  for (const r of reqs) {
    const dt = extractDate(r);
    if (!dt) continue;
    const row = perDay.find((x) => x.date === fmtDateKey(dt));
    if (row) row.Requests += 1;
  }

  for (const d of dons) {
    const dt = extractDate(d);
    if (!dt) continue;
    const row = perDay.find((x) => x.date === fmtDateKey(dt));
    const approved = (d.status || "pending").toLowerCase() === "approved";
    if (row && approved) row.Donations += 1;
  }

  // Most requested blood groups (30d)
  const groupCount = {};
  for (const r of reqs) {
    const dt = extractDate(r);
    if (!dt || dt < start30) continue;
    const g = r.bloodGroup || "N/A";
    groupCount[g] = (groupCount[g] || 0) + 1;
  }
  const groupData = Object.entries(groupCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <section className="max-w-5xl mx-auto w-full">
      <h2 className="text-lg font-semibold mb-3">Community Insights</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Registered Donors</div>
          <div className="text-2xl font-bold mt-0.5">{loading ? "…" : donorCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">Users with role "user" or "donor"</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Blood Banks</div>
          <div className="text-2xl font-bold mt-0.5">{loading ? "…" : banksCount}</div>
          <div className="text-[11px] text-gray-400 mt-1">Docs in BloodBanks</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Units Delivered (30d)</div>
          <div className="text-2xl font-bold mt-0.5">{loading ? "…" : unitsDelivered30d}</div>
          <div className="text-[11px] text-gray-400 mt-1">Approved blood requests</div>
        </div>
      </div>

      {/* Line: Requests vs Donations (14d) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="text-sm font-semibold mb-2">Requests & Donations per Day (14 days)</div>
        <div style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perDay} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Requests" stroke="#ef4444" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Donations" stroke="#3b82f6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar: Most requested groups */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-sm font-semibold mb-2">Most Requested Blood Groups (30 days)</div>
        <div style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupData} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!groupData.length && (
          <div className="text-xs text-gray-500 mt-2">No requests in the last 30 days.</div>
        )}
      </div>
    </section>
  );
}
