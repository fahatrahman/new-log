// backfillSearchKeywords.js  (run from project root)
const admin = require("firebase-admin");

// Use Application Default Credentials so we don't hardcode a path here.
// In PowerShell, set $env:GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const tokens = (s) =>
  (s || "").toLowerCase().split(/[^a-z0-9+]+/i).filter(Boolean);

const makeKeywords = (b) => {
  const parts = [
    ...tokens(b.name),
    ...tokens(b.address || b.location),
    ...tokens(b.city),
  ];
  const groups = Array.isArray(b.bloodGroups)
    ? b.bloodGroups
    : Array.isArray(b.bloodGroup)
    ? b.bloodGroup
    : [];
  groups.forEach((g) => parts.push(String(g).toLowerCase()));
  return Array.from(new Set(parts));
};

(async () => {
  const snap = await db.collection("BloodBanks").get();
  if (snap.empty) {
    console.log("No BloodBanks found.");
    process.exit(0);
  }
  let updated = 0;
  const batch = db.batch();
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const kw = makeKeywords(data);
    batch.update(doc.ref, { searchKeywords: kw });
    updated++;
  });
  await batch.commit();
  console.log(`✅ searchKeywords backfilled on ${updated} BloodBanks document(s).`);
})();
