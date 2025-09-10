const Logger = require('./logger');
const EmbedBuilderUtil = require('./embedBuilder');

async function handleCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        Logger.error(`Commande non trouvée: ${interaction.commandName}`, 'InteractionHandler');
        try {
            await safeReply(interaction, {
                embeds: [EmbedBuilderUtil.createErrorEmbed('Cette commande n\'existe pas.')],
                ephemeral: true
            });
        } catch (error) {
            Logger.error(`Impossible de répondre à l'interaction: ${error}`, 'InteractionHandler');
        }
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        Logger.error(error, 'CommandExecution');
        await handleInteractionError(interaction);
    }
}

async function handleTicket(interaction) {
    try {
        // Vérifier si c'est une interaction du système de tickets C
        if (interaction.customId?.includes('ticketC') || 
            ['create_ticketC', 'select_ticket_topicC', 'close_ticketC', 
             'confirm_closeC', 'reopen_ticketC', 'take_ticketC', 
             'unassign_ticketC', 'delete_ticketC'].includes(interaction.customId)) {
            const ticketC = require('../ticketC');
            await ticketC.handleInteractionC(interaction);
        } else {
            const ticket = require('../ticket');
            await ticket.handleInteraction(interaction);
        }
    } catch (error) {
        Logger.error(error, 'TicketHandler');
        await handleInteractionError(interaction);
    }
}

async function safeReply(interaction, options) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: options.ephemeral });
        }
        
        if (interaction.deferred) {
            return await interaction.editReply(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (error) {
        if (error.code === 10062) { // Unknown interaction
            Logger.log('Interaction expirée, ignorée ❌', 'InteractionHandler');
            return;
        }
        throw error;
    }
}

async function handleInteractionError(interaction) {
    const errorMessage = 'Une erreur est survenue lors du traitement de votre demande.';
    try {
        await safeReply(interaction, {
            content: errorMessage,
            ephemeral: true
        });
    } catch (error) {
        Logger.error('Impossible de répondre à l\'erreur d\'interaction: ' + error, 'InteractionHandler');
    }
}

module.exports = {
    handleCommand,
    handleTicket,
    safeReply
};