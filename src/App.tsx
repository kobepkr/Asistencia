import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";

import Main from "./pages/main";
import RegistroInstituciones from "./pages/registroInstuticiones";
import RecuperarContrasena from "./pages/recuperarContrasena";

const App: React.FC = () => {
  return (
    <Router>
        <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/recuperarContrasena" element={<RecuperarContrasena />} />
      <Route path="/main" element={<Main />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/registro-instituciones" element={<RegistroInstituciones />} />
    </Routes>
    </Router>
  );
};

export default App;
