import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { getAuth } from "firebase/auth";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const ref = useRef(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  // close dropdown when clicking outside
  useEffect(() => {
    function handle(e) {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) {
      console.warn("mark read failed:", e);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        className="relative bg-white text-red-600 rounded-full p-2 shadow hover:bg-red-50 transition"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        {/* Bell icon (emoji) */}
        <span className="text-lg">🔔</span>

        {/* Badge for unread count */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b font-semibold">Notifications</div>
          {items.length === 0 ? (
            <div className="p-3 text-sm text-gray-600">No notifications yet.</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 text-sm ${
                    n.read ? "bg-white" : "bg-red-50"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {n.kind === "blood_request"
                          ? "Blood Request"
                          : "Donation"}{" "}
                        · {n.status}
                      </div>
                      <div className="text-gray-700">{n.message}</div>
                      {n.createdAt?.seconds && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(
                            n.createdAt.seconds * 1000
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="self-start text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 transition"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
