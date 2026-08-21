const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/index.routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.set('trust proxy', true);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// API BACKEND
// ===============================
app.use('/api', apiRoutes);

// ===============================
// FRONTEND
// ===============================
// Esta ruta asume que backend y frontend están al mismo nivel:
// sistema_asistencia_columbe/backend
// sistema_asistencia_columbe/frontend
const frontendPath = path.join(__dirname, '../../frontend');

app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/marcaciones', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'marcaciones.html'));
});

app.get('/administracion', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/reportes', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'reportes.html'));
});

// ===============================
// ERRORES
// ===============================
app.use('/api', notFoundHandler);

app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Página no encontrada</h1>
    <p>Regrese al sistema: <a href="/">Inicio</a></p>
  `);
});

app.use(errorHandler);

module.exports = app;