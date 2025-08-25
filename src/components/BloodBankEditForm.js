// src/components/BloodBankEditForm.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth, signOut } from "firebase/auth";
import AlertManager from "./AlertManager";

/**
 * This is your original editor restored with:
 * - live stock editing (± per group)
 * - inline details display
 * - moderate donation/blood requests (approve/reject) with stock checks
 * - urgent alerts section
 *
 * Plus small compatibility upgrades:
 * - Reads supported groups from `bloodGroup` OR `bloodGroups`
 * - Reads/filters pending items by `bloodBankId` OR `bankId`
 */
export default function BloodBankEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bloodBank, setBloodBank] = useState(null);
  const [bloodStock, setBloodStock] = useState({});
  const [pendingDonations, setPendingDonations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(""); // "donation" | "request"

  const [stockWarning, setStockWarning] = useState("");
  const [insufficientGroup, setInsufficientGroup] = useState("");
  const [shakeGroup, setShakeGroup] = useState("");

  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toDateString = (val) => {
    if (!val) return "N/A";
    try {
      if (typeof val === "object" && val.seconds) {
        return new Date(val.seconds * 1000).toLocaleString();
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
      return String(val);
    } catch {
      return String(val);
    }
  };

  // Load bank + normalize stock to supported groups
  useEffect(() => {
    const ref = doc(db, "BloodBanks", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setBloodBank(data);

      // accept either bloodGroup (array) or bloodGroups (array)
      const supported = Array.isArray(data.bloodGroup)
        ? data.bloodGroup
        : Array.isArray(data.bloodGroups)
        ? data.bloodGroups
        : [];

      const current = data.bloodStock || {};
      const normalized = {};
      supported.forEach((g) => (normalized[g] = current[g] || 0));
      setBloodStock(normalized);
    });
    return () => unsub();
  }, [id]);

  // Pending donations for this bank (support both field names)
  useEffect(() => {
    const col = collection(db, "donation_schedules");

    const unsubA = onSnapshot(query(col, where("bloodBankId", "==", id)), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter((x) => !x.status || x.status.toLowerCase() === "pending");
      setPendingDonations((prev) => mergeUniqueById(prev, filtered));
    });

    const unsubB = onSnapshot(query(col, where("bankId", "==", id)), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter((x) => !x.status || x.status.toLowerCase() === "pending");
      setPendingDonations((prev) => mergeUniqueById(prev, filtered));
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [id]);

  // Pending blood requests (support both field names)
  useEffect(() => {
    const col = collection(db, "blood_requests");

    const unsubA = onSnapshot(query(col, where("bloodBankId", "==", id)), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter((x) => !x.status || x.status.toLowerCase() === "pending");
      setPendingRequests((prev) => mergeUniqueById(prev, filtered));
    });

    const unsubB = onSnapshot(query(col, where("bankId", "==", id)), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter((x) => !x.status || x.status.toLowerCase() === "pending");
      setPendingRequests((prev) => mergeUniqueById(prev, filtered));
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [id]);

  const mergeUniqueById = (a, b) => {
    const map = new Map();
    [...a, ...b].forEach((x) => map.set(x.id, x));
    return Array.from(map.values());
  };

  const pushStock = async (updated) => {
    try {
      await updateDoc(doc(db, "BloodBanks", id), { bloodStock: updated });
    } catch (e) {
      console.error("Error updating stock:", e);
    }
  };

  const inc = (group) => {
    const next = { ...bloodStock, [group]: (bloodStock[group] || 0) + 1 };
    setBloodStock(next);
    pushStock(next);
  };

  const dec = (group) => {
    const current = bloodStock[group] || 0;
    if (current === 0) return;
    const next = { ...bloodStock, [group]: current - 1 };
    setBloodStock(next);
    pushStock(next);
  };

  // in‑app notification helper (unchanged)
  const createNotification = async ({ userId, kind, refId, status, message }) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        kind,
        refId,
        status,
        message,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("notif create failed:", e);
    }
  };

  const handleRequestAction = async (colName, item, newStatus) => {
    try {
      // If approving a blood request, ensure stock is sufficient and decrement
      if (colName === "blood_requests" && newStatus === "approved") {
        const need = Number(item.units || 0);
        const group = item.bloodGroup;
        const have = Number(bloodStock[group] || 0);

        if (need > have) {
          const msg = `Not enough ${group} units to approve (${need} needed, ${have} available).`;
          setStockWarning(msg);
          setInsufficientGroup(group);
          setShakeGroup(group);
          setTimeout(() => {
            setStockWarning("");
            setInsufficientGroup("");
            setShakeGroup("");
          }, 3000);
          return;
        }

        const next = { ...bloodStock, [group]: have - need };
        setBloodStock(next);
        await pushStock(next);
      }

      // Update status in Firestore (donations or requests)
      await updateDoc(doc(db, colName, item.id), { status: newStatus.toLowerCase() });

      // create in‑app notification
      if (colName === "blood_requests") {
        await createNotification({
          userId: item.userId,
          kind: "blood_request",
          refId: item.id,
          status: newStatus.toLowerCase(),
          message: `Your blood request at ${bloodBank?.name || "the bank"} was ${newStatus.toLowerCase()}.`,
        });
      } else if (colName === "donation_schedules") {
        await createNotification({
          userId: item.userId,
          kind: "donation_schedule",
          refId: item.id,
          status: newStatus.toLowerCase(),
          message: `Your donation with ${bloodBank?.name || "the bank"} was ${newStatus.toLowerCase()}.`,
        });
      }

      // Remove from local pending lists + close modal
      if (colName === "donation_schedules") {
        setPendingDonations((prev) => prev.filter((d) => d.id !== item.id));
      } else if (colName === "blood_requests") {
        setPendingRequests((prev) => prev.filter((r) => r.id !== item.id));
      }
      setSelectedItem(null);
    } catch (e) {
      console.error("Action error:", e);
    }
  };

  if (!bloodBank) return <p className="p-4">Loading...</p>;

  const statusClass = (s) => {
    switch ((s || "pending").toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  // prefer bloodGroup array (original); fallback to bloodGroups
  const supportedGroups = Array.isArray(bloodBank.bloodGroup)
    ? bloodBank.bloodGroup
    : Array.isArray(bloodBank.bloodGroups)
    ? bloodBank.bloodGroups
    : [];

  return (
    <div className="min-h-screen flex flex-col gap-8">
      {/* Lightweight header */}
      <nav className="bg-red-600 text-white sticky top-0 z-50 flex justify-between items-center px-6 py-3 font-bold text-lg">
        <button onClick={() => navigate(`/bloodbank/${id}`)} className="hover:opacity-90">
          {bloodBank?.name || "Blood Bank"}
        </button>
        <div className="flex gap-2">
          <button
            className="bg-white text-red-600 font-semibold rounded px-3 py-1 hover:bg-red-100"
            onClick={() => navigate("/home")}
          >
            Home
          </button>
          <button
            className="bg-white text-red-600 font-semibold rounded px-3 py-1 hover:bg-red-100"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      {stockWarning && (
        <p className="max-w-6xl mx-auto p-2 bg-yellow-100 text-red-700 font-semibold rounded mb-4 text-center animate-pulse">
          {stockWarning}
        </p>
      )}

      {/* Info + Stock */}
      <div className="flex flex-col md:flex-row gap-6 p-6 max-w-6xl mx-auto mt-2">
        <div className="md:w-1/3 bg-white rounded-lg shadow p-6 space-y-2">
          <h2 className="text-2xl font-bold text-center">{bloodBank.name}</h2>
          <p><strong>Location:</strong> {bloodBank.address || bloodBank.location || "N/A"}</p>
          <p><strong>Contact:</strong> {bloodBank.contactNumber || bloodBank.contact || "N/A"}</p>
          <p><strong>Email:</strong> {bloodBank.email || "N/A"}</p>
          <p className="mt-4 text-sm text-gray-600 text-center">Use the controls to adjust stock.</p>
        </div>

        <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {supportedGroups.map((group) => {
            const qty = Number(bloodStock[group] || 0);
            const threshold = Number(bloodBank.lowStockThreshold ?? 5);
            const isLow = qty <= threshold;
            const shake = shakeGroup === group;
            const highlight = insufficientGroup === group;

            return (
              <div
                key={group}
                className={`relative flex flex-col items-center p-4 rounded-lg shadow-md bg-gradient-to-r from-red-500 to-red-600 text-white transition ${
                  shake ? "animate-shake" : ""
                } ${highlight ? "ring-4 ring-yellow-300" : ""}`}
              >
                <span className="font-bold text-xl mb-2">{group}</span>
                {isLow && (
                  <span className="absolute top-2 right-2 bg-yellow-300 text-red-900 font-bold text-xs px-2 py-1 rounded-full animate-pulse">
                    Low Stock
                  </span>
                )}
                <span className="text-2xl font-mono mb-2">{qty}</span>
                <div className="flex gap-2">
                  <button onClick={() => dec(group)} className="bg-red-800 hover:bg-red-900 rounded px-4 py-1 font-semibold">–</button>
                  <button onClick={() => inc(group)} className="bg-green-800 hover:bg-green-900 rounded px-4 py-1 font-semibold">+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Donations */}
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4 text-red-600">Pending Donation Requests</h3>
        {pendingDonations.length ? (
          <ul className="space-y-2">
            {pendingDonations.map((don) => (
              <li key={don.id} className={`flex justify-between items-center p-2 border rounded ${statusClass(don.status)}`}>
                <span>
                  {don.donorName || don.name || "Donor"} – {don.bloodGroup || "N/A"} – {toDateString(don.date)}
                </span>
                <div className="flex gap-2">
                  {(!don.status || (don.status || "").toLowerCase() === "pending") && (
                    <>
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        onClick={() => handleRequestAction("donation_schedules", don, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        onClick={() => handleRequestAction("donation_schedules", don, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={() => { setSelectedItem(don); setModalType("donation"); }}
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No donation requests.</p>
        )}
      </div>

      {/* Pending Blood Requests */}
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4 text-red-600">Pending Blood Requests</h3>
        {pendingRequests.length ? (
          <ul className="space-y-2">
            {pendingRequests.map((req) => (
              <li key={req.id} className={`flex justify-between items-center p-2 border rounded ${statusClass(req.status)}`}>
                <span>
                  {req.requesterName || req.name || "Requester"} – {req.bloodGroup || "N/A"} – {req.units || 0} unit(s) – {toDateString(req.date)}
                </span>
                <div className="flex gap-2">
                  {(!req.status || (req.status || "").toLowerCase() === "pending") && (
                    <>
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        onClick={() => handleRequestAction("blood_requests", req, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        onClick={() => handleRequestAction("blood_requests", req, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={() => { setSelectedItem(req); setModalType("request"); }}
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No blood requests.</p>
        )}
      </div>

      {/* Urgent Alerts Manager */}
      <div id="alerts" className="max-w-6xl mx-auto p-6">
        <AlertManager bankId={id} bankName={bloodBank?.name} />
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-red-600">
              {modalType === "donation" ? "Donation Request Details" : "Blood Request Details"}
            </h3>
            <div className="space-y-2 max-h-80 overflow-auto">
              {Object.entries(selectedItem).map(([k, v]) => (
                <p key={k} className="text-sm">
                  <strong>{k}:</strong>{" "}
                  {typeof v === "object" && v?.seconds
                    ? new Date(v.seconds * 1000).toLocaleString()
                    : String(v)}
                </p>
              ))}
            </div>
            <div className="flex justify-end mt-4 gap-2">
              {(!selectedItem.status || (selectedItem.status || "").toLowerCase() === "pending") && (
                <>
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    onClick={() =>
                      handleRequestAction(
                        modalType === "donation" ? "donation_schedules" : "blood_requests",
                        selectedItem,
                        "approved"
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    onClick={() =>
                      handleRequestAction(
                        modalType === "donation" ? "donation_schedules" : "blood_requests",
                        selectedItem,
                        "rejected"
                      )
                    }
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
