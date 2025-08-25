/* eslint-disable */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const cfg = functions.config().smtp || {};
const transporter = nodemailer.createTransport({
  host: cfg.host,
  port: Number(cfg.port || 465),
  secure: String(cfg.secure || "true") === "true",
  auth: { user: cfg.user, pass: cfg.pass },
});

const FROM = cfg.from || "Amar Rokto <no-reply@localhost>";

async function fetchUserEmail(userId) {
  if (!userId) return null;
  const snap = await db.collection("Users").doc(userId).get();
  return snap.exists ? snap.data().email || null : null;
}

async function fetchBank(bloodBankId) {
  if (!bloodBankId) return { name: null, email: null };
  const snap = await db.collection("BloodBanks").doc(bloodBankId).get();
  if (!snap.exists) return { name: null, email: null };
  const d = snap.data();
  return { name: d.name || null, email: d.email || null };
}

async function sendEmail(to, subject, html) {
  if (!to) return;
  await transporter.sendMail({ from: FROM, to, subject, html });
}

/** blood_requests status change -> email requester (and bank optionally) */
exports.onBloodRequestStatusChange = functions.firestore
  .document("blood_requests/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const prev = (before.status || "pending").toLowerCase();
    const curr = (after.status || "pending").toLowerCase();
    if (prev === curr) return;

    const userEmail = await fetchUserEmail(after.userId);
    const bank = await fetchBank(after.bloodBankId);

    const subject = `Your blood request was ${curr}`;
    const html = `
      <h3>Blood Request ${curr.toUpperCase()}</h3>
      <p>Hi,</p>
      <p>Your request at <strong>${bank.name || "the blood bank"}</strong> has been <strong>${curr}</strong>.</p>
      <ul>
        <li>Blood Group: <strong>${after.bloodGroup || "-"}</strong></li>
        <li>Units: <strong>${after.units || "-"}</strong></li>
        <li>Required Date: <strong>${after.date || "-"}</strong></li>
      </ul>
      <p>Thank you for using Amar Rokto.</p>
    `;
    await sendEmail(userEmail, subject, html);

    if (bank.email) {
      await sendEmail(
        bank.email,
        `Request ${curr}: ${after.bloodGroup || ""} (${after.units || 0}u)`,
        `<p>Status changed to <b>${curr}</b> for a request you manage.</p>`
      );
    }
  });

/** donation_schedules status change -> email donor (and bank optionally) */
exports.onDonationStatusChange = functions.firestore
  .document("donation_schedules/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const prev = (before.status || "pending").toLowerCase();
    const curr = (after.status || "pending").toLowerCase();
    if (prev === curr) return;

    const userEmail = await fetchUserEmail(after.userId);
    const bank = await fetchBank(after.bloodBankId);

    const subject = `Your donation schedule was ${curr}`;
    const html = `
      <h3>Donation ${curr.toUpperCase()}</h3>
      <p>Hi,</p>
      <p>Your donation with <strong>${bank.name || "the blood bank"}</strong> is <strong>${curr}</strong>.</p>
      <ul>
        <li>Date: <strong>${after.date || "-"}</strong></li>
        <li>Time: <strong>${after.time || "-"}</strong></li>
      </ul>
      <p>Thank you for donating with Amar Rokto.</p>
    `;
    await sendEmail(userEmail, subject, html);

    if (bank.email) {
      await sendEmail(
        bank.email,
        `Donation ${curr}: ${after.donorName || "Donor"}`,
        `<p>Status changed to <b>${curr}</b> for a donation you manage.</p>`
      );
    }
  });
