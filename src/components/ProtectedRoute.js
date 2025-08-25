// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";


export default function ProtectedRoute({ children, allowedRoles, denyRoles }) {
const { user, role, loading } = useAuth();


if (loading) return <p>Loading...</p>; // spinner or loading screen


if (!user) return <Navigate to="/login" replace />;


if (denyRoles && denyRoles.includes(role)) return <Navigate to="/home" replace />;


if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/home" replace />;


return children;
}