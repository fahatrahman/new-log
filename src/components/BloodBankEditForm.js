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
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth, signOut } from "firebase/auth";
import AlertManager from "./AlertManager";

export default function BloodBankEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bloodBank, setBloodBank] = useState(null);
  const [bloodStock, setBloodStock] = useState({});
  const [pendingDonations, setPendingDonations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [historyDonations, setHistoryDonations] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [showAllDonHistory, setShowAllDonHistory] = useState(false);
  const [showAllReqHistory, setShowAllReqHistory] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState("");

  const [stockWarning, setStockWarning] = useState("");
  const [insufficientGroup, setInsufficientGroup] = useState("");
  const [shakeGroup, setShakeGroup] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    address: "",
    city: "",
    contact: "",
    email: "",
    lowStockThreshold: 5,
    bannerUrl: "",
  });

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

  const tokenize = (s) =>
    (s || "").toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);

  const computeSearchKeywords = (bank) => {
    const parts = [
      ...tokenize(bank.name),
      ...tokenize(bank.address || bank.location),
      ...tokenize(bank.city),
    ];
    const groups = Array.isArray(bank.bloodGroups)
      ? bank.bloodGroups
      : Array.isArray(bank.bloodGroup)
      ? bank.bloodGroup
      : [];
    groups.forEach((g) => parts.push(String(g).toLowerCase()));
    return Array.from(new Set(parts));
  };

  useEffect(() => {
    const ref = doc(db, "BloodBanks", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setBloodBank(data);

      setEditData((p) => ({
        ...p,
        name: data.name || "",
        address: data.address || data.location || "",
        city: data.city || "",
        contact: data.contactNumber || data.contact || "",
        email: data.email || "",
        lowStockThreshold:
          typeof data.lowStockThreshold === "number"
            ? data.lowStockThreshold
            : 5,
        bannerUrl: data.bannerUrl || "",
      }));

      try {
        const currentKW = Array.isArray(data.searchKeywords)
          ? data.searchKeywords
          : [];
        const freshKW = computeSearchKeywords(data);
        if (
          freshKW.length &&
          (currentKW.length === 0 ||
            freshKW.join("|") !== currentKW.join("|"))
        ) {
          updateDoc(doc(db, "BloodBanks", id), { searchKeywords: freshKW }).catch(
            () => {}
          );
        }
      } catch {}

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

  useEffect(() => {
    const col = collection(db, "donation_schedules");
    const unsubA = onSnapshot(
      query(col, where("bloodBankId", "==", id)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = list.filter(
          (x) => !x.status || x.status.toLowerCase() === "pending"
        );
        setPendingDonations((prev) => mergeUniqueById(prev, filtered));
      }
    );
    const unsubB = onSnapshot(
      query(col, where("bankId", "==", id)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = list.filter(
          (x) => !x.status || x.status.toLowerCase() === "pending"
        );
        setPendingDonations((prev) => mergeUniqueById(prev, filtered));
      }
    );
    return () => {
      unsubA();
      unsubB();
    };
  }, [id]);

  useEffect(() => {
    const col = collection(db, "blood_requests");
    const unsubA = onSnapshot(
      query(col, where("bloodBankId", "==", id)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = list.filter(
          (x) => !x.status || x.status.toLowerCase() === "pending"
        );
        setPendingRequests((prev) => mergeUniqueById(prev, filtered));
      }
    );
    const unsubB = onSnapshot(
      query(col, where("bankId", "==", id)),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = list.filter(
          (x) => !x.status || x.status.toLowerCase() === "pending"
        );
        setPendingRequests((prev) => mergeUniqueById(prev, filtered));
      }
    );
    return () => {
      unsubA();
      unsubB();
    };
  }, [id]);

  useEffect(() => {
    const col = collection(db, "donation_schedules");
    const unsub1 = onSnapshot(
      query(
        col,
        where("bloodBankId", "==", id),
        where("status", "in", ["approved", "rejected"]),
        orderBy("timestamp", "desc")
      ),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistoryDonations((prev) => mergeReplace(prev, rows));
      }
    );
    const unsub2 = onSnapshot(
      query(
        col,
        where("bankId", "==", id),
        where("status", "in", ["approved", "rejected"]),
        orderBy("timestamp", "desc")
      ),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistoryDonations((prev) => mergeReplace(prev, rows));
      }
    );
    return () => {
      unsub1();
      unsub2();
    };
  }, [id]);

  useEffect(() => {
    const col = collection(db, "blood_requests");
    const unsub1 = onSnapshot(
      query(
        col,
        where("bloodBankId", "==", id),
        where("status", "in", ["approved", "rejected"]),
        orderBy("timestamp", "desc")
      ),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistoryRequests((prev) => mergeReplace(prev, rows));
      }
    );
    const unsub2 = onSnapshot(
      query(
        col,
        where("bankId", "==", id),
        where("status", "in", ["approved", "rejected"]),
        orderBy("timestamp", "desc")
      ),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistoryRequests((prev) => mergeReplace(prev, rows));
      }
    );
    return () => {
      unsub1();
      unsub2();
    };
  }, [id]);

  const mergeUniqueById = (a, b) => {
    const map = new Map();
    [...a, ...b].forEach((x) => map.set(x.id, x));
    return Array.from(map.values());
  };
  const mergeReplace = (a, b) => {
    const map = new Map(a.map((x) => [x.id, x]));
    b.forEach((x) => map.set(x.id, x));
    return [...map.values()].sort(
      (x, y) => (y?.timestamp?.seconds || 0) - (x?.timestamp?.seconds || 0)
    );
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

      if (colName === "donation_schedules" && newStatus === "approved") {
        const addUnits = Number(item.units || 1);
        const group = item.bloodGroup;
        if (group) {
          const have = Number(bloodStock[group] || 0);
          const next = { ...bloodStock, [group]: have + addUnits };
          setBloodStock(next);
          await pushStock(next);
        }
      }

      await updateDoc(doc(db, colName, item.id), {
        status: newStatus.toLowerCase(),
      });

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

  if (!bloodBank) return <p className="p-6">Loading…</p>;

  const statusClass = (s) => {
    switch ((s || "pending").toLowerCase()) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
      default:
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    }
  };

  const supportedGroups =
    Array.isArray(bloodBank.bloodGroup)
      ? bloodBank.bloodGroup
      : Array.isArray(bloodBank.bloodGroups)
      ? bloodBank.bloodGroups
      : [];

  const renderRow = (item, type) => (
    <li key={item.id} className={`p-3 rounded-lg ${statusClass(item.status)}`}>
      <div className="flex justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-semibold capitalize">{item.status || "pending"}</div>
          <div className="text-sm">
            {type === "donation" ? (
              <>
                <span className="font-medium">
                  {item.donorName || item.name || "Donor"}
                </span>
                {item.bloodGroup && <> · {item.bloodGroup}</>}
              </>
            ) : (
              <>
                <span className="font-medium">
                  {item.requesterName || item.name || "Requester"}
                </span>
                {item.bloodGroup && <> · {item.bloodGroup}</>}
                {item.units && <> · {item.units} unit(s)</>}
              </>
            )}
          </div>
          <div className="text-xs opacity-80">
            {item.date ? toDateString(item.date) : item.time ? item.time : ""}
          </div>
          {(item.notes || item.additionalInfo) && (
            <div className="text-xs opacity-80">
              Notes: {item.notes || item.additionalInfo}
            </div>
          )}
        </div>
        <button
          className="ui-btn ui-info"
          onClick={() => {
            setSelectedItem(item);
            setModalType(type === "donation" ? "donation" : "request");
          }}
        >
          View
        </button>
      </div>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* UI helpers + NEW heading font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap');
        .ui-card{background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,.06);box-shadow:0 8px 28px rgba(0,0,0,.06)}
        .ui-btn{display:inline-flex;align-items:center;gap:.5rem;border-radius:10px;padding:.6rem 1rem;font-weight:700;font-size:.875rem;line-height:1;transition:transform .06s ease,box-shadow .2s ease}
        .ui-btn:active{transform:translateY(1px)}
        .ui-primary{background:#dc2626;color:#fff} .ui-primary:hover{background:#b91c1c}
        .ui-soft{background:#f3f4f6;color:#111827} .ui-soft:hover{background:#e5e7eb}
        .ui-outline{border:1px solid #e5e7eb;color:#111827;background:#fff} .ui-outline:hover{background:#f9fafb}
        .ui-success{background:#059669;color:#fff} .ui-success:hover{background:#047857}
        .ui-danger{background:#e11d48;color:#fff} .ui-danger:hover{background:#be123c}
        .ui-info{background:#2563eb;color:#fff} .ui-info:hover{background:#1d4ed8}
        @keyframes card-shake{0%{transform:translateX(0)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-3px)}100%{transform:translateX(0)}}
        .animate-shake{animation:card-shake .35s ease-in-out 2}

        /* Section titles: bigger + new font */
        .ui-section-title{
          font-family:'Poppins', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji';
          font-size:1.25rem;        /* text-xl */
          line-height:1.35;
          font-weight:700;
          letter-spacing:.2px;
        }
      `}</style>

      {/* Header */}
      <div
        className="relative text-white"
        style={{
          background:
            bloodBank.bannerUrl && bloodBank.bannerUrl.length > 4
              ? `linear-gradient(0deg, rgba(220,38,38,.85), rgba(225,29,72,.85)), url(${bloodBank.bannerUrl}) center/cover no-repeat`
              : "linear-gradient(90deg, #e11d48, #dc2626)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight drop-shadow">
              {bloodBank.name || "Blood Bank"}
            </h1>
            <div className="text-white/90 text-sm">
              {bloodBank.address || bloodBank.location || "Address not provided"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="ui-btn ui-outline cursor-pointer">
              Upload banner
              <input type="file" accept="image/*" className="hidden" />
            </label>
            <button className="ui-btn ui-soft" onClick={() => setShowEdit(true)}>
              Edit profile
            </button>
            <button className="ui-btn ui-outline" onClick={() => navigate(`/bloodbank/${id}`)}>
              View public page
            </button>
            <button className="ui-btn ui-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {stockWarning && (
        <div className="max-w-6xl mx-auto mt-3 px-4">
          <p className="ui-card p-3 text-center text-rose-700 bg-rose-50 border-rose-200">
            {stockWarning}
          </p>
        </div>
      )}

      {/* CONTENT GRID */}
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory */}
          <div className="ui-card p-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="ui-section-title">Blood Inventory</h2>
              <div className="text-xs text-gray-500">
                Click +/– to adjust (yellow badge = low)
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {supportedGroups.map((group, i) => {
                const qty = Number(bloodStock[group] || 0);
                const threshold = Number(bloodBank.lowStockThreshold ?? 5);
                const isLow = qty <= threshold;
                const shake = shakeGroup === group;
                const highlight = insufficientGroup === group;
                const tone =
                  i % 2 === 0
                    ? "bg-white border-gray-100"
                    : "bg-rose-50 border-rose-100";

                return (
                  <div
                    key={group}
                    className={`rounded-lg p-4 text-center border ${tone} ${
                      highlight ? "ring-4 ring-amber-300" : ""
                    } ${shake ? "animate-shake" : ""} shadow-sm`}
                  >
                    <div className="text-sm font-semibold tracking-wide">
                      {group}
                    </div>
                    <div className="mt-1 text-2xl font-bold">{qty}</div>

                    {isLow && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Low
                      </div>
                    )}

                    <div className="mt-3 flex justify-center gap-2">
                      <button onClick={() => dec(group)} className="ui-btn ui-danger">
                        –
                      </button>
                      <button onClick={() => inc(group)} className="ui-btn ui-success">
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending queues */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="ui-card p-5 bg-rose-50 border-rose-100">
              <h3 className="ui-section-title text-red-600">
                Pending Donation Requests
              </h3>
              <div className="mt-3 space-y-2">
                {pendingDonations.length ? (
                  pendingDonations.map((don) => (
                    <div
                      key={don.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg ${statusClass(
                        don.status
                      )}`}
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {don.donorName || don.name || "Donor"}
                        </span>{" "}
                        – {don.bloodGroup || "N/A"} – {toDateString(don.date)}
                      </div>
                      <div className="shrink-0 flex gap-2">
                        {(!don.status ||
                          (don.status || "").toLowerCase() === "pending") && (
                          <>
                            <button
                              className="ui-btn ui-success"
                              onClick={() =>
                                handleRequestAction(
                                  "donation_schedules",
                                  don,
                                  "approved"
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="ui-btn ui-danger"
                              onClick={() =>
                                handleRequestAction(
                                  "donation_schedules",
                                  don,
                                  "rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          className="ui-btn ui-info"
                          onClick={() => {
                            setSelectedItem(don);
                            setModalType("donation");
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No donation requests.</p>
                )}
              </div>
            </div>

            <div className="ui-card p-5 bg-white">
              <h3 className="ui-section-title text-red-600">
                Pending Blood Requests
              </h3>
              <div className="mt-3 space-y-2">
                {pendingRequests.length ? (
                  pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg ${statusClass(
                        req.status
                      )}`}
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {req.requesterName || req.name || "Requester"}
                        </span>{" "}
                        – {req.bloodGroup || "N/A"} – {req.units || 0} unit(s) –{" "}
                        {toDateString(req.date)}
                      </div>
                      <div className="shrink-0 flex gap-2">
                        {(!req.status ||
                          (req.status || "").toLowerCase() === "pending") && (
                          <>
                            <button
                              className="ui-btn ui-success"
                              onClick={() =>
                                handleRequestAction(
                                  "blood_requests",
                                  req,
                                  "approved"
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="ui-btn ui-danger"
                              onClick={() =>
                                handleRequestAction(
                                  "blood_requests",
                                  req,
                                  "rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          className="ui-btn ui-info"
                          onClick={() => {
                            setSelectedItem(req);
                            setModalType("request");
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No blood requests.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="ui-card p-5 bg-white max-h-[420px] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="ui-section-title">Schedule Donation History</h3>
              {historyDonations.length > 6 && (
                <button
                  className="ui-btn ui-outline"
                  onClick={() => setShowAllDonHistory((v) => !v)}
                >
                  {showAllDonHistory ? "Show less" : `Show all (${historyDonations.length})`}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {historyDonations.length ? (
                (showAllDonHistory ? historyDonations : historyDonations.slice(0, 10)).map((d) =>
                  renderRow(d, "donation")
                )
              ) : (
                <p className="text-sm text-gray-500">No past donations yet.</p>
              )}
            </ul>
          </div>

          <div className="ui-card p-5 bg-rose-50 border-rose-100 max-h-[420px] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="ui-section-title">Blood Request History</h3>
              {historyRequests.length > 6 && (
                <button
                  className="ui-btn ui-outline"
                  onClick={() => setShowAllReqHistory((v) => !v)}
                >
                  {showAllReqHistory ? "Show less" : `Show all (${historyRequests.length})`}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {historyRequests.length ? (
                (showAllReqHistory ? historyRequests : historyRequests.slice(0, 10)).map((r) =>
                  renderRow(r, "request")
                )
              ) : (
                <p className="text-sm text-gray-500">No past blood requests yet.</p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div id="alerts" className="max-w-6xl mx-auto p-4">
        <div className="ui-card p-5 bg-white">
          <h3 className="ui-section-title mb-3">Urgent Alerts</h3>
          <AlertManager bankId={id} bankName={bloodBank?.name} />
        </div>
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="ui-card w-full max-w-md p-5">
            <h3 className="ui-section-title text-red-600 mb-3">
              {modalType === "donation" ? "Donation Details" : "Blood Request Details"}
            </h3>
            <div className="space-y-2 max-h-80 overflow-auto text-sm">
              {Object.entries(selectedItem).map(([k, v]) => (
                <p key={k}>
                  <strong className="capitalize">{k}:</strong>{" "}
                  {typeof v === "object" && v?.seconds
                    ? new Date(v.seconds * 1000).toLocaleString()
                    : String(v)}
                </p>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="ui-btn ui-soft" onClick={() => setSelectedItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ui-card w-full max-w-lg p-5 bg-white">
            <h3 className="ui-section-title mb-4">Edit Blood Bank</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium">Name</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium">Address</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">City</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Contact</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.contact}
                  onChange={(e) => setEditData({ ...editData, contact: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Low stock threshold</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded-md px-3 py-2"
                  value={editData.lowStockThreshold}
                  onChange={(e) =>
                    setEditData({ ...editData, lowStockThreshold: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium">Banner URL (optional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="https://..."
                  value={editData.bannerUrl}
                  onChange={(e) => setEditData({ ...editData, bannerUrl: e.target.value })}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  If set, it appears behind the red gradient at the top.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="ui-btn ui-soft" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button
                className="ui-btn ui-primary"
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, "BloodBanks", id), {
                      name: editData.name.trim(),
                      address: editData.address.trim(),
                      city: editData.city.trim(),
                      contactNumber: editData.contact.trim(),
                      contact: editData.contact.trim(),
                      email: editData.email.trim(),
                      lowStockThreshold: Number(editData.lowStockThreshold || 0),
                      bannerUrl: editData.bannerUrl.trim(),
                    });
                    setShowEdit(false);
                  } catch (e) {
                    console.error("Update profile error:", e);
                  }
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
