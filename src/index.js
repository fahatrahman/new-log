// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-center" />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

// Optional: measure performance
// reportWebVitals(console.log);
reportWebVitals();
