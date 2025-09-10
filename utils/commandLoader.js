const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                Logger.error(`La commande ${file} manque de propriétés requises`, 'CommandLoader');
            }
        } catch (error) {
            Logger.error(`Erreur lors du chargement de la commande ${file}: ${error}`, 'CommandLoader');
        }
    }
}

module.exports = { loadCommands };