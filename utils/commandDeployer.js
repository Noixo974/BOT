const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const Logger = require('./logger');

class CommandDeployer {
    constructor(token, clientId) {
        this.rest = new REST().setToken(token);
        this.clientId = clientId;
        this.commands = [];
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        this.commands = [];
        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if ('data' in command) {
                    this.commands.push(command.data.toJSON());
                } else {
                    Logger.error(`La commande ${file} n'a pas de propriété "data"`, 'Deploy');
                }
            } catch (error) {
                Logger.error(`Erreur lors du chargement de la commande ${file}: ${error}`, 'Deploy');
            }
        }
    }

    async deployToGuild(guildId) {
        try {
            Logger.log(`Déploiement des commandes pour le serveur ${guildId} (ID)... ⌛`, 'Deploy');
            
            const data = await this.rest.put(
                Routes.applicationGuildCommands(this.clientId, guildId),
                { body: this.commands }
            );

            Logger.log(`\x1b[32m${data.length} commande(s) déployée(s) avec succès pour le serveur ${guildId} (ID) ! ✅\x1b[0m`, 'Deploy');
            return true;
        } catch (error) {
            Logger.error(`Erreur lors du déploiement pour le serveur ${guildId}: ${error}`, 'Deploy');
            return false;
        }
    }

    async deleteGlobalCommands() {
        try {
            Logger.log('Suppression des commandes globales... ⌛', 'Deploy');
            await this.rest.put(
                Routes.applicationCommands(this.clientId),
                { body: [] }
            );
            Logger.log('\x1b[32mCommandes globales supprimées avec succès ✅\x1b[0m', 'Deploy');
            return true;
        } catch (error) {
            Logger.error('Erreur lors de la suppression des commandes globales:', error);
            return false;
        }
    }

    async deployToGuilds(guildIds) {
        await this.loadCommands();
        await this.deleteGlobalCommands();

        const results = await Promise.all(
            guildIds.map(guildId => this.deployToGuild(guildId))
        );

        return results.every(result => result === true);
    }
}

module.exports = CommandDeployer;