// backend/models/Usuarios.js
import mongoose from 'mongoose';

const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

export default Usuario;
