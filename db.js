const mysql = require('mysql2/promise');
const Logger = require('./utils/logger');

// Configuration de la connexion MySQL
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

async function initDatabase() {
    try {
        // Test de connexion
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        Logger.log('\x1b[32mConnexion à la base de données MySQL établie avec succès ✅\x1b[0m', 'Database');
    } catch (error) {
        Logger.error('Erreur lors de la connexion à la base de données MySQL:', 'Database');
        Logger.error(error, 'Database');
        throw error;
    }
}

module.exports = {
    pool,
    initDatabase
};