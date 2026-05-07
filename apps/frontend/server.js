/**
 * Express server para servir el build de Angular en producción.
 * Railway ejecuta este archivo con: node server.js
 */
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 4200;
const distPath = path.join(__dirname, 'dist', 'finanzas-frontend');

// Servir archivos estáticos del build de Angular
app.use(express.static(distPath));

// SPA fallback: todas las rutas devuelven index.html (para Angular Router)
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend serving on port ${port}`);
});
