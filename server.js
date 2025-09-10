const express = require('express');
const path = require('path');
const Logger = require('./utils/logger');

const app = express();
const PORT = 5000;

// Servir les fichiers d'archives statiques
app.use('/archives', express.static(path.join(__dirname, 'archives')));

// Route de test
app.get('/', (req, res) => {
    res.send(`
        <h1>O'Sheas Barbers - Archives de Tickets</h1>
        <p>Les archives de tickets sont disponibles via les liens générés par le bot.</p>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    Logger.log(`Serveur d'archives démarré sur le port ${PORT}`, 'ArchiveServer');
});

module.exports = app;