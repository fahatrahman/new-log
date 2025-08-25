// src/components/Home.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import bannerImage from "../ban.jpg";
import { Users, Droplet, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom"; // <-- added

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bloodBanks, setBloodBanks] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [showEligibilityBanner, setShowEligibilityBanner] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [donorCount, setDonorCount] = useState(0);
  const [banksCount, setBanksCount] = useState(0);
  const [unitsDelivered30d, setUnitsDelivered30d] = useState(0);
  const [drives, setDrives] = useState([]);
  const facts = useMemo(
    () => [
      "You can donate whole blood every 90 days.",
      "O− is the universal donor; AB+ is the universal recipient.",
      "One donation can help save up to three lives.",
      "Stay hydrated and eat iron-rich foods before donating.",
    ],
    []
  );
  const [factIdx, setFactIdx] = useState(0);
  const factTimer = useRef(null);
  const navigate = useNavigate(); // <-- added

  // (your useEffects unchanged...)

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === "") return setFilteredBanks([]);

    const filtered = bloodBanks.filter(
      (bank) =>
        (bank.name || "").toLowerCase().includes(value.toLowerCase()) ||
        (bank.address || bank.location || "")
          .toLowerCase()
          .includes(value.toLowerCase())
    );
    setFilteredBanks(filtered);
  };

  const sevClass = (s) =>
    s === "emergency"
      ? "bg-red-700 text-white"
      : s === "high"
      ? "bg-red-600 text-white"
      : s === "medium"
      ? "bg-yellow-500 text-black"
      : "bg-gray-300 text-black";

  return (
    <div className="min-h-screen flex flex-col">
      {/* HERO */}
      <div className="relative h-[22rem] md:h-[26rem] w-full overflow-hidden">
        <img
          src={bannerImage}
          alt="Donate blood"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-5xl mx-auto h-full px-4 flex flex-col items-start justify-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Save Lives Today
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-xl">
            Request blood when you need it, or schedule a donation with nearby
            blood banks. Every drop matters.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to="/request-blood"
              className="bg-white text-red-600 font-semibold px-4 py-2 rounded-md shadow hover:bg-red-50"
            >
              Request Blood
            </Link>
            <Link
              to="/schedule-donation"
              className="bg-red-600/90 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-red-700"
            >
              Become a Donor
            </Link>
            <a
              href="#find"
              className="bg-white/10 text-white font-semibold px-4 py-2 rounded-md border border-white/30 hover:bg-white/20"
            >
              Find Blood Bank
            </a>
          </div>
        </div>
      </div>

      {/* ELIGIBILITY PROMPT */}
      {!checkingEligibility && showEligibilityBanner && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Complete your Donor Eligibility</p>
              <p className="text-sm">
                Before scheduling a donation, please complete the quick
                eligibility checklist.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/eligibility"
                className="px-3 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Check now
              </Link>
              <button
                onClick={() => setShowEligibilityBanner(false)}
                className="px-3 py-2 rounded border border-yellow-300 text-yellow-900 text-sm hover:bg-yellow-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIND BLOOD BANK */}
      <div id="find" className="max-w-xl mx-auto px-4 text-center mt-8">
        <h2 className="text-red-600 text-3xl font-semibold mb-4">
          Find Nearest Blood Bank
        </h2>
        <input
          type="text"
          placeholder="Search blood banks by name or address"
          value={searchTerm}
          onChange={handleSearchChange}
          className="input"
        />
        {filteredBanks.length > 0 && (
          <ul className="max-h-72 overflow-y-auto text-left bg-white border border-gray-300 rounded-md shadow-md mt-4">
            {filteredBanks.map((bank) => (
              <li
                key={bank.id}
                className="px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-red-50 transition"
                onClick={() => navigate(`/bloodbank/${bank.id}`)} // <-- fixed
              >
                <strong className="block">{bank.name}</strong>
                <span className="text-sm text-gray-600">
                  {bank.address || bank.location || "Location N/A"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* UPCOMING DRIVES */}
      {drives.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 w-full mt-10">
          <h2 className="text-xl font-semibold mb-3">Upcoming Blood Drives</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {drives.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="text-sm font-semibold">
                  {d.bankName || "Blood Bank"}
                </div>
                <div className="text-xs text-gray-500">
                  {d._when?.toLocaleString() || "TBA"}
                </div>
                {d.city && <div className="text-xs text-gray-500">City: {d.city}</div>}
                <Link
                  to="/schedule-donation"
                  className="mt-3 inline-block text-sm bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700"
                >
                  Join / Schedule
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* rest of your component unchanged */}
    </div>
  );
}
