require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./utils/commandLoader');
const { handleCommand, handleTicket } = require('./utils/interactionHandler');
const { initializeShopStatus, handleStatusButton } = require('./utils/shopStatus');
const Logger = require('./utils/logger');
const config = require('./config/config');
const ticket = require('./ticket');
const ticketC = require('./ticketC');
const db = require('./db');
const { handleRoleInteraction, initializeRoleMessages } = require('./commands/role');
const { initTableCarteCadeau } = require('./commands/giftcard');
const { deployCommands } = require('./deploy-commands');
require('./server'); // Start the archive web server

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// Make client globally accessible
global.client = client;
client.commands = new Collection();

// Error handling
process.on('unhandledRejection', (error) => {
    Logger.error(error, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
    Logger.error(error, 'Uncaught Exception');
    process.exit(1);
});

client.once('ready', async () => {
    try {
        Logger.log(`\x1b[32mConnecté en tant que ${client.user.tag} ! ✅\x1b[0m`, 'Bot');
        
        // Initialisation de la base de données
        await db.initDatabase();
        
        // Initialisation des commandes
        await loadCommands(client);
        Logger.log('Chargement des commandes terminé ✅', 'Bot');

        // Recharger les absences existantes
        const absenceCommand = require('./commands/absence');
        await absenceCommand.reloadAbsences(client);
        
        // Initialisation du panneau de tickets
        if (config.discord.channels.tickets) {
            Logger.log('Initialisation du panneau de tickets... ⌛', 'Tickets');
            await ticket.sendTicketPanel(client, config.discord.channels.tickets);
        }

        if (config.discord.channels.ticketsC) {
            Logger.log('Initialisation du panneau de tickets des candidatures... ⌛', 'TicketsC');
            await ticketC.sendTicketPanelC(client, config.discord.channels.ticketsC);
        }
        
        // Initialisation du panneau de statut du salon
        await initializeShopStatus(client);

        // Initialisation des messages de rôle
        Logger.log('Initialisation du panneau de rôle... ⌛', 'Roles');
        await initializeRoleMessages(client);

        // Initialisation de la table des cartes cadeaux
        await initTableCarteCadeau();
        
        Logger.log('\x1b[32mBot complètement initialisé et prêt ! ✅\x1b[0m', 'Bot');
    } catch (error) {
        Logger.error(error, 'Initialization');
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'on' || interaction.customId === 'off') {
                await handleStatusButton(interaction);
                return;
            }
            
            if (interaction.customId.startsWith('creer_cartecadeau') || 
                interaction.customId.startsWith('verifier_cartecadeau') ||
                interaction.customId.startsWith('liste_cartecadeau') ||
                interaction.customId.startsWith('supprimer_cartecadeau') ||
                interaction.customId.startsWith('utiliser_carte_') ||
                interaction.customId.startsWith('voir_solde_')) {
                const commandeCarteCadeau = client.commands.get('cartecadeau');
                await commandeCarteCadeau.handleButtons(interaction);
                return;
            }

            await handleTicket(interaction);
            return;
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'role_select') {
                await handleRoleInteraction(interaction);
                return;
            }
            await handleTicket(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'messModal') {
                const messCommand = client.commands.get('mess');
                if (messCommand && typeof messCommand.modalSubmit === 'function') {
                    await messCommand.modalSubmit(interaction);
                } else {
                    Logger.error(`Handler for messModal not found.`, 'Modal Handler');
                    await interaction.reply({ content: 'Erreur : Impossible de traiter ce formulaire.', ephemeral: true });
                }
                return;
            }

            if (interaction.customId.startsWith('modal_')) {
                const commandeCarteCadeau = client.commands.get('cartecadeau');
                await commandeCarteCadeau.handleModals(interaction);
                return;
            }
        }

        if (interaction.isChatInputCommand()) {
            Logger.command(interaction.user, interaction.commandName, interaction.options.data);
            await handleCommand(interaction, client);
        }
    } catch (error) {
        Logger.error(error, 'Interaction Handler');
        const errorMessage = 'Une erreur est survenue lors du traitement de votre commande.';
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        } catch (replyError) {
            Logger.error(replyError, 'Error Reply Handler');
        }
    }
});

client.login(process.env.TOKEN);