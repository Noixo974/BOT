const { SlashCommandBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('livraison')
    .setDescription('Crée une annonce de livraison avec les détails fournis')
    .addIntegerOption(option => 
      option.setName('personnes')
        .setDescription('Le nombre de personnes nécessaires')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('date')
        .setDescription('La date de la livraison (jj-mm-aa)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('heure')
        .setDescription('L\'heure de la livraison (hh:mm)')
        .setRequired(true)),

  async execute(interaction) {
    // Récupération des options
    const personnes = interaction.options.getInteger('personnes');
    const date = interaction.options.getString('date');
    const heure = interaction.options.getString('heure');

    const roleMention = `||<@&${config.discord.roles.deliveryNotification}>||`;

    // Création de l'embed avec couleur noire
    const embed = {
      color: 0x000000,  // Couleur noire
      title: 'Livraison 🚚',
      description: `Bonjour 👋,\n\nBesoin de **${personnes}** personne(s) pour une livraison le **${date}** à **${heure}** 📅.\n\nMerci de réagir si vous êtes disponible ou non avec les réactions ci-dessus. *(Pas de faux plan si ✅)*.\n\nMerci à tous !`,
      footer: {
        text: 'Cordialement, La Logistique',
        iconURL: interaction.client.user.displayAvatarURL(),
      },
    };

    // Envoi du message dans le canal
    const sentMessage = await interaction.reply({
      content: roleMention,
      allowedMentions: { parse: ['roles'] },
      embeds: [embed],
      fetchReply: true,  // Permet de récupérer le message après son envoi
    });

    // Ajouter les réactions ✅ et ❌
    await sentMessage.react('✅');
    await sentMessage.react('❌');
  },
};
