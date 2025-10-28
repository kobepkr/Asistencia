import React from "react";
import "./login.css";
import logo from "../assets/vl.png"; // <- Importa la imagen correctamente


const Login: React.FC = () => {
  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo */}
        <img src={logo} alt="Logo" className="login-logo" />

        <h2>Sistema de Asistencia</h2>

        <form>
          <div className="input-group">
            <label htmlFor="usuario">Usuario</label>
            <input type="text" id="usuario" placeholder="Ingresa tu usuario" />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button type="submit" className="btn-login">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
