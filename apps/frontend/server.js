/**
 * Express server para servir el build de Angular en producción.
 * Railway ejecuta este archivo con: node server.js
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

// Angular 18 puede generar los archivos en /browser o directamente en dist/
const candidates = [
  path.join(__dirname, 'dist', 'finanzas-frontend', 'browser'),
  path.join(__dirname, 'dist', 'finanzas-frontend'),
];

const distPath = candidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (!distPath) {
  console.error('ERROR: No se encontró index.html en ninguna de estas rutas:');
  candidates.forEach((p) => console.error(' -', p));
  process.exit(1);
}

console.log(`Sirviendo archivos desde: ${distPath}`);

// Servir archivos estáticos del build de Angular
app.use(express.static(distPath));

// SPA fallback: todas las rutas devuelven index.html (para Angular Router)
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend corriendo en puerto ${port}`);
});
