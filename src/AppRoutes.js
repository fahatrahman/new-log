// src/AppRoutes.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./components/Home";
import Login from "./components/login";
import Register from "./components/register";
import Profile from "./components/profile";
import DonorDashboard from "./components/DonorDashboard";
import ReceiverDashboard from "./components/ReceiverDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ScheduleDonation from "./components/ScheduleDonation";
import RequestBlood from "./components/RequestBlood";
import BloodBankDetail from "./components/BloodBankDetail";
import BloodBankEditForm from "./components/BloodBankEditForm";
import Analysis from "./components/Analysis";

// ✅ Make sure you have this component file:
// src/components/EligibilityCheck.js
import EligibilityCheck from "./components/EligibilityCheck";

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {user && <Navbar />} {/* Show navbar only when logged in */}
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />

        {/* Auth */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/home" />} />

        {/* General User Routes */}
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute denyRoles={["bloodbank"]}>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/request-blood" element={
          <ProtectedRoute denyRoles={["bloodbank"]}>
            <RequestBlood />
          </ProtectedRoute>
        } />
        <Route path="/schedule-donation" element={
          <ProtectedRoute denyRoles={["bloodbank"]}>
            <ScheduleDonation />
          </ProtectedRoute>
        } />

        {/* ✅ Eligibility route (visible to signed-in non-bloodbank users) */}
        <Route path="/eligibility" element={
          <ProtectedRoute denyRoles={["bloodbank"]}>
            <EligibilityCheck />
          </ProtectedRoute>
        } />

        {/* Analysis (any signed-in role) */}
        <Route path="/analysis" element={
          <ProtectedRoute>
            <Analysis />
          </ProtectedRoute>
        } />

        {/* Blood Bank Routes */}
        <Route path="/bloodbank/:id" element={
          <ProtectedRoute>
            <BloodBankDetail />
          </ProtectedRoute>
        } />
        <Route path="/bloodbank/edit/:id" element={
          <ProtectedRoute allowedRoles={["bloodbank", "admin"]}>
            <BloodBankEditForm />
          </ProtectedRoute>
        } />

        {/* Dashboards */}
        <Route path="/donor-dashboard" element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DonorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/receiver-dashboard" element={
          <ProtectedRoute allowedRoles={["user"]}>
            <ReceiverDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}
