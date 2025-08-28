// backfillSearchKeywords.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // download from Firebase console

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const tokens = (s) =>
  (s || "").toLowerCase().split(/[^a-z0-9+]+/i).filter(Boolean);

const makeKeywords = (b) => {
  const parts = [
    ...tokens(b.name),
    ...tokens(b.address || b.location),
    ...tokens(b.city),
  ];
  const groups = Array.isArray(b.bloodGroups) ? b.bloodGroups
               : Array.isArray(b.bloodGroup)  ? b.bloodGroup  : [];
  groups.forEach(g => parts.push(String(g).toLowerCase()));
  return Array.from(new Set(parts));
};

(async () => {
  const snap = await db.collection("BloodBanks").get();
  const batch = db.batch();
  snap.forEach(doc => {
    const kw = makeKeywords(doc.data() || {});
    batch.update(doc.ref, { searchKeywords: kw });
  });
  await batch.commit();
  console.log("✅ searchKeywords backfilled for all BloodBanks");
})();
