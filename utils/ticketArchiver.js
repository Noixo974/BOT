const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const Logger = require('./logger');
const config = require('../config/config');

class TicketArchiver {
    static async generateTicketHTML(channel, closedBy) {
        try {
            const messages = await this.fetchAllMessages(channel);
            const html = await this.createHTMLContent(channel, messages, closedBy);
            const filename = `ticket-${channel.name}-${Date.now()}.html`;
            const filepath = path.join(__dirname, '..', 'archives', filename);
            
            // Créer le dossier archives s'il n'existe pas
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            
            // Écrire le fichier HTML
            await fs.writeFile(filepath, html, 'utf8');
            
            Logger.log(`Archive HTML créée: ${filename}`, 'TicketArchiver');
            return { filename, filepath };
        } catch (error) {
            Logger.error(`Erreur lors de la génération HTML: ${error}`, 'TicketArchiver');
            throw error;
        }
    }

    static async fetchAllMessages(channel) {
        try {
            let allMessages = [];
            let lastMessageId = null;
            
            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }
                
                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break;
                
                allMessages = allMessages.concat(Array.from(messages.values()));
                lastMessageId = messages.last().id;
            }
            
            // Trier par date (plus ancien en premier)
            return allMessages.reverse();
        } catch (error) {
            Logger.error(`Erreur lors de la récupération des messages: ${error}`, 'TicketArchiver');
            return [];
        }
    }

    static async createHTMLContent(channel, messages, closedBy) {
        const channelName = channel.name;
        const guildName = channel.guild.name;
        const closureDate = new Date().toLocaleString('fr-FR');
        
        let messagesHTML = '';
        
        for (const message of messages) {
            const timestamp = message.createdAt.toLocaleString('fr-FR');
            const author = message.author;
            const content = await this.formatMessageContent(message.content, message, channel.guild);
            const avatarURL = author.displayAvatarURL({ size: 32 });
            
            // Couleur basée sur le type d'utilisateur
            let userColor = '#7289da'; // Couleur par défaut
            if (author.bot) userColor = '#7289da';
            else if (message.member?.roles.cache.some(role => 
                config.discord.roles.staff.includes(role.id) || 
                role.id === config.discord.roles.admin)) {
                userColor = '#f04747'; // Rouge pour staff
            }

            // Traiter les embeds du bot
            let embedsHTML = '';
            if (message.embeds && message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    embedsHTML += this.formatEmbed(embed);
                }
            }
            
            messagesHTML += `
                <div class="message">
                    <img src="${avatarURL}" alt="${author.username}" class="avatar">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="username" style="color: ${userColor};">${author.displayName || author.username}</span>
                            <span class="timestamp">${timestamp}</span>
                        </div>
                        <div class="message-text">${content}${embedsHTML}</div>
                    </div>
                </div>
            `;
        }

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archive Ticket - ${channelName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
        }
        
        .header {
            background-color: #2f3136;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #7289da;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: #ffffff;
            font-size: 24px;
        }
        
        .header-info {
            color: #b9bbbe;
            font-size: 14px;
        }
        
        .messages-container {
            background-color: #40444b;
            border-radius: 8px;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .message {
            display: flex;
            margin-bottom: 15px;
            padding: 8px 0;
        }
        
        .message:hover {
            background-color: #32353b;
            border-radius: 4px;
            padding: 8px;
            margin: 0 -8px 15px -8px;
        }
        
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .message-content {
            flex: 1;
            min-width: 0;
        }
        
        .message-header {
            display: flex;
            align-items: baseline;
            margin-bottom: 4px;
        }
        
        .username {
            font-weight: 600;
            margin-right: 8px;
            cursor: pointer;
        }
        
        .timestamp {
            font-size: 12px;
            color: #72767d;
            font-weight: 400;
        }
        
        .message-text {
            word-wrap: break-word;
            color: #dcddde;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: #2f3136;
            border-radius: 8px;
            color: #72767d;
            font-size: 12px;
        }
        
        .mention {
            background-color: rgba(114, 137, 218, 0.1);
            color: #7289da;
            padding: 0 2px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Archive du Ticket: #${channelName}</h1>
        <div class="header-info">
            <strong>Serveur:</strong> ${guildName}<br>
            <strong>Fermé par:</strong> ${closedBy.displayName || closedBy.username}<br>
            <strong>Date de fermeture:</strong> ${closureDate}<br>
            <strong>Nombre de messages:</strong> ${messages.length}
        </div>
    </div>
    
    <div class="messages-container">
        ${messagesHTML}
    </div>
    
    <div class="footer">
        Archive générée automatiquement par ${guildName} - O'Sheas Barbers Bot<br>
        Développé par Nathan Pablosco ❤️
    </div>
</body>
</html>
        `;
    }

    static async formatMessageContent(content, message, guild) {
        if (!content && (!message.embeds || message.embeds.length === 0)) return '<em>Message vide</em>';
        if (!content) return ''; // Si pas de contenu mais des embeds
        
        // Traiter les mentions AVANT d'échapper le HTML
        // Mentions utilisateurs
        const userMentions = content.match(/<@!?(\d+)>/g);
        if (userMentions) {
            for (const mention of userMentions) {
                const userId = mention.match(/<@!?(\d+)>/)[1];
                try {
                    let member = guild.members.cache.get(userId);
                    if (!member) {
                        // Essayer de récupérer le membre depuis l'API
                        try {
                            member = await guild.members.fetch(userId);
                        } catch (fetchError) {
                            // Si on ne peut pas récupérer le membre, utiliser un nom générique
                            content = content.replace(mention, '@utilisateur');
                            continue;
                        }
                    }
                    const username = member.displayName || member.user.username;
                    content = content.replace(mention, `@${username}`);
                } catch {
                    content = content.replace(mention, '@utilisateur');
                }
            }
        }

        // Mentions de rôles
        const roleMentions = content.match(/<@&(\d+)>/g);
        if (roleMentions) {
            for (const mention of roleMentions) {
                const roleId = mention.match(/<@&(\d+)>/)[1];
                try {
                    const role = guild.roles.cache.get(roleId);
                    const roleName = role ? role.name : 'rôle';
                    content = content.replace(mention, `@${roleName}`);
                } catch {
                    content = content.replace(mention, '@rôle');
                }
            }
        }

        // Mentions de channels
        const channelMentions = content.match(/<#(\d+)>/g);
        if (channelMentions) {
            for (const mention of channelMentions) {
                const channelId = mention.match(/<#(\d+)>/)[1];
                try {
                    const channel = guild.channels.cache.get(channelId);
                    const channelName = channel ? channel.name : 'salon';
                    content = content.replace(mention, `#${channelName}`);
                } catch {
                    content = content.replace(mention, '#salon');
                }
            }
        }
        
        // Échapper les caractères HTML APRÈS avoir traité les mentions
        content = content.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
        
        // Formatage Discord basic
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        content = content.replace(/__(.*?)__/g, '<u>$1</u>');
        content = content.replace(/~~(.*?)~~/g, '<del>$1</del>');
        content = content.replace(/`(.*?)`/g, '<code style="background-color: #2f3136; padding: 2px 4px; border-radius: 3px;">$1</code>');
        
        // Styliser les mentions après l'échappement HTML
        content = content.replace(/@([a-zA-Z0-9_\-À-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF ]+)/g, '<span class="mention">@$1</span>');
        
        // Liens
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #00aff4;">$1</a>');
        
        // Sauts de ligne
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }

    static formatEmbed(embed) {
        let embedHTML = '<div class="embed" style="border-left: 3px solid #7289da; background-color: #2f3136; padding: 10px; margin: 5px 0; border-radius: 3px;">';
        
        if (embed.title) {
            embedHTML += `<div class="embed-title" style="color: #ffffff; font-weight: bold; margin-bottom: 5px;">${embed.title}</div>`;
        }
        
        if (embed.description) {
            embedHTML += `<div class="embed-description" style="color: #dcddde; margin-bottom: 10px;">${embed.description}</div>`;
        }
        
        if (embed.fields && embed.fields.length > 0) {
            embedHTML += '<div class="embed-fields">';
            for (const field of embed.fields) {
                embedHTML += `
                    <div class="embed-field" style="margin-bottom: 10px;">
                        <div class="embed-field-name" style="color: #ffffff; font-weight: bold; margin-bottom: 2px;">${field.name}</div>
                        <div class="embed-field-value" style="color: #dcddde;">${field.value}</div>
                    </div>
                `;
            }
            embedHTML += '</div>';
        }
        
        if (embed.footer) {
            embedHTML += `<div class="embed-footer" style="color: #72767d; font-size: 12px; margin-top: 10px;">${embed.footer.text}</div>`;
        }
        
        embedHTML += '</div>';
        return embedHTML;
    }

    static async sendArchiveNotification(client, channel, closedBy, archiveFile) {
        try {
            const archiveChannel = await client.channels.fetch(config.discord.channels.ticketArchives);
            if (!archiveChannel) {
                Logger.error('Salon d\'archives non trouvé', 'TicketArchiver');
                return;
            }

            // URL publique du fichier
            const domain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
            let publicURL;
            if (domain.startsWith('http')) {
                publicURL = `${domain}/archives/${archiveFile.filename}`;
            } else if (domain === 'localhost:5000') {
                publicURL = `http://${domain}/archives/${archiveFile.filename}`;
            } else {
                publicURL = `https://${domain}/archives/${archiveFile.filename}`;
            }

            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🗂️ Ticket Fermé')
                .setDescription(`Un ticket a été fermé et archivé.`)
                .addFields(
                    { name: '👤 Fermé par', value: closedBy.displayName || closedBy.username, inline: true },
                    { name: '💬 Salon', value: `#${channel.name}`, inline: true },
                    { name: '📋 Archive', value: `[📄 Voir l'historique complet](${publicURL})`, inline: false }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️',
                    iconURL: client.user.displayAvatarURL()
                });

            await archiveChannel.send({ embeds: [embed] });
            Logger.log(`Notification d'archive envoyée pour le ticket #${channel.name}`, 'TicketArchiver');
        } catch (error) {
            Logger.error(`Erreur lors de l'envoi de la notification: ${error}`, 'TicketArchiver');
        }
    }
}

module.exports = TicketArchiver;