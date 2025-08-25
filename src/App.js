// src/App.js
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";

export default function App() {
  return (
    <AuthProvider>
      {/* IMPORTANT: repo name is "new-log" */}
      <BrowserRouter basename="/new-log">
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}
