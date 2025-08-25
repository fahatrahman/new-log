import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const bloodGroupsOptions = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function Register() {
  const [registerType, setRegisterType] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // user fields
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  // bloodbank fields
  const [bbName, setBbName] = useState("");
  const [bbAddress, setBbAddress] = useState("");
  const [bbContact, setBbContact] = useState("");
  const [bbBloodGroups, setBbBloodGroups] = useState([]);

  const navigate = useNavigate();

  const toggleBloodGroup = (group) => {
    setBbBloodGroups((prev) =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (registerType === "user") {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: fname,
          lastName: lname,
          photo: "",
          createdAt: new Date(),
          role: "user",
          // additional profile fields for eligibility
          bloodGroup: "",
          age: "",
          gender: "",
          city: "",
        });
        toast.success("User Registered Successfully!", { position: "top-center" });
        navigate("/home");
      } else {
        await setDoc(doc(db, "BloodBanks", user.uid), {
          uid: user.uid,
          name: bbName,
          email: user.email,
          address: bbAddress,
          contactNumber: bbContact,
          bloodGroup: bbBloodGroups,
          bloodStock: {},
          createdAt: new Date(),
          role: "bloodbank",
          lowStockThreshold: 5,
        });
        toast.success("Blood Bank Registered Successfully!", { position: "top-center" });
        navigate(`/bloodbank/edit/${user.uid}`);
      }

      // reset
      setEmail(""); setPassword(""); setFname(""); setLname("");
      setBbName(""); setBbAddress(""); setBbContact(""); setBbBloodGroups([]);
    } catch (error) {
      toast.error(error.message, { position: "bottom-center" });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h3 className="text-2xl font-semibold mb-6 text-center text-red-600">Sign Up</h3>

        <div className="flex justify-center mb-6 gap-2">
          <button type="button" onClick={() => setRegisterType("user")}
            className={`px-4 py-2 rounded font-semibold ${registerType === "user" ? "bg-red-600 text-white" : "bg-gray-200"}`}>
            User
          </button>
          <button type="button" onClick={() => setRegisterType("bloodbank")}
            className={`px-4 py-2 rounded font-semibold ${registerType === "bloodbank" ? "bg-red-600 text-white" : "bg-gray-200"}`}>
            Blood Bank
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input type="email" placeholder="Email" className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} required />

          {registerType === "user" ? (
            <>
              <input type="text" placeholder="First name" value={fname}
                onChange={(e) => setFname(e.target.value)} className="input" required />
              <input type="text" placeholder="Last name" value={lname}
                onChange={(e) => setLname(e.target.value)} className="input" />
            </>
          ) : (
            <>
              <input type="text" placeholder="Blood Bank Name" value={bbName}
                onChange={(e) => setBbName(e.target.value)} className="input" required />
              <input type="text" placeholder="Address" value={bbAddress}
                onChange={(e) => setBbAddress(e.target.value)} className="input" required />
              <input type="text" placeholder="Contact Number" value={bbContact}
                onChange={(e) => setBbContact(e.target.value)} className="input" required />

              <div>
                <label className="block mb-1 font-medium text-gray-700">Supported Blood Groups</label>
                <div className="flex flex-wrap gap-3">
                  {bloodGroupsOptions.map((group) => (
                    <label key={group} className="flex items-center gap-2">
                      <input type="checkbox" checked={bbBloodGroups.includes(group)}
                        onChange={() => toggleBloodGroup(group)} />
                      <span>{group}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary">Register</button>
        </form>

        <p className="mt-4 text-right text-gray-600">
          Already registered?{" "}
          <a href="/login" className="text-red-600 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
}
