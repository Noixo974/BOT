const moment = require('moment');
const schedule = require('node-schedule');
const db = require('../db');
const Logger = require('../utils/logger');
const config = require('../config/config');

class AbsenceService {
    static async ensureTableExists() {
        await db.pool.execute(`
            CREATE TABLE IF NOT EXISTS absences (
                id SERIAL PRIMARY KEY,
                userId VARCHAR(255) NOT NULL,
                guildId VARCHAR(255) NOT NULL,
                startDate TIMESTAMP NOT NULL,
                endDate TIMESTAMP NOT NULL,
                reason TEXT NOT NULL,
                roleAdded BOOLEAN DEFAULT FALSE,
                roleRemoved BOOLEAN DEFAULT FALSE
            )
        `);
    }

    static async createAbsence(userId, startDate, endDate, reason, guildId) {
        try {
            await AbsenceService.ensureTableExists();
            
            await db.pool.execute(
                'INSERT INTO absences (userId, startDate, endDate, reason, guildId) VALUES (?, ?, ?, ?, ?)',
                [userId, startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'), reason, guildId]
            );

            Logger.log(`Absence enregistrée pour l'utilisateur ${userId}`, 'AbsenceService');
            return true;
        } catch (error) {
            Logger.error(`Erreur lors de la création de l'absence: ${error}`, 'AbsenceService');
            throw error;
        }
    }

    static async scheduleRoleManagement(client, userId, guildId, startDate, endDate) {
        try {
            // Planifier l'ajout du rôle
            const addJob = schedule.scheduleJob(startDate.toDate(), async () => {
                await AbsenceService.addAbsenceRole(client, userId, guildId, startDate);
            });

            // Planifier le retrait du rôle
            const removeJob = schedule.scheduleJob(endDate.toDate(), async () => {
                await AbsenceService.removeAbsenceRole(client, userId, guildId, endDate);
            });

            // Vérifier si la date de début est déjà passée
            if (moment().isAfter(startDate)) {
                await AbsenceService.addAbsenceRole(client, userId, guildId, startDate);
            }

            return { addJob, removeJob };
        } catch (error) {
            Logger.error(`Erreur lors de la planification des rôles: ${error}`, 'AbsenceService');
            throw error;
        }
    }

    static async addAbsenceRole(client, userId, guildId, startDate) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            const role = await guild.roles.fetch(config.discord.roles.absence);
            
            if (role && member) {
                await member.roles.add(role);
                await db.pool.execute(
                    'UPDATE absences SET roleAdded = TRUE WHERE userId = ? AND startDate = ?',
                    [userId, startDate.format('YYYY-MM-DD HH:mm:ss')]
                );
                Logger.log(`Rôle d'absence ajouté à ${userId}`, 'AbsenceService');
            }
        } catch (error) {
            Logger.error(`Erreur lors de l'ajout du rôle d'absence: ${error}`, 'AbsenceService');
        }
    }

    static async removeAbsenceRole(client, userId, guildId, endDate) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            const role = await guild.roles.fetch(config.discord.roles.absence);
            
            if (role && member) {
                await member.roles.remove(role);
                await db.pool.execute(
                    'UPDATE absences SET roleRemoved = TRUE WHERE userId = ? AND endDate = ?',
                    [userId, endDate.format('YYYY-MM-DD HH:mm:ss')]
                );
                Logger.log(`Rôle d'absence retiré de ${userId}`, 'AbsenceService');
            }
        } catch (error) {
            Logger.error(`Erreur lors du retrait du rôle d'absence: ${error}`, 'AbsenceService');
        }
    }

    static async reloadAbsences(client) {
        try {
            await AbsenceService.ensureTableExists();

            const result = await db.pool.execute(`
                SELECT * FROM absences 
                WHERE endDate > NOW() 
                AND (roleAdded = FALSE OR roleRemoved = FALSE)
            `);
            const absences = result[0];

            for (const absence of absences) {
                const startDate = moment(absence.startDate);
                const endDate = moment(absence.endDate);
                const now = moment();

                if (!absence.roleAdded && now.isSameOrAfter(startDate)) {
                    // Si la date de début est déjà passée, ajouter le rôle immédiatement
                    await AbsenceService.addAbsenceRole(client, absence.userId, absence.guildId, startDate);
                } else if (!absence.roleAdded && startDate.isAfter(now)) {
                    // Sinon, planifier l'ajout du rôle
                    schedule.scheduleJob(startDate.toDate(), async () => {
                        await AbsenceService.addAbsenceRole(client, absence.userId, absence.guildId, startDate);
                    });
                }

                if (!absence.roleRemoved && endDate.isAfter(now)) {
                    schedule.scheduleJob(endDate.toDate(), async () => {
                        await AbsenceService.removeAbsenceRole(client, absence.userId, absence.guildId, endDate);
                    });
                }
            }

            Logger.log(`${absences.length} absence(s) rechargée(s)`, 'AbsenceService');
        } catch (error) {
            Logger.error(`Erreur lors du rechargement des absences: ${error}`, 'AbsenceService');
        }
    }
}

module.exports = AbsenceService;