// src/App.js
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./AppRoutes";


function App() {
return (
<AuthProvider>
<Router>
<AppRoutes />
<ToastContainer />
</Router>
</AuthProvider>
);
}


export default App;