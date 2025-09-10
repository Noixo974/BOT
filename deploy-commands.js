require('dotenv').config();
const CommandDeployer = require('./utils/commandDeployer');
const Logger = require('./utils/logger');

async function deployCommands() {
    try {
        const deployer = new CommandDeployer(process.env.TOKEN, process.env.CLIENT_ID);
        const guildIds = process.env.GUILD_IDS.split(',');
        
        const success = await deployer.deployToGuilds(guildIds);
        return success;
    } catch (error) {
        Logger.error('Erreur lors du déploiement des commandes:', error);
        return false;
    }
}

// Si le fichier est exécuté directement
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };