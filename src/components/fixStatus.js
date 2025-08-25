// fixStatus.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // your downloaded JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixMissingStatus() {
  const collections = ["blood_requests", "donation_schedules"];
  try {
    for (const colName of collections) {
      const snapshot = await db.collection(colName).get();

      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (!data.status) {
          await db.collection(colName).doc(docSnap.id).update({ status: "pending" });
          console.log(`Updated ${colName}/${docSnap.id} with status: pending`);
        }
      });
    }
    console.log("✅ All missing status fields have been updated!");
  } catch (error) {
    console.error("❌ Error updating missing status fields:", error);
  }
}

fixMissingStatus();
