const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class EmbedBuilderUtil {
  static createBaseEmbed() {
    return new EmbedBuilder()
      .setColor('#000000')
      .setFooter({
        text: config.bot.footer,
        iconURL: global.client?.user?.displayAvatarURL()
      });
  }

  static createErrorEmbed(message) {
    return this.createBaseEmbed()
      .setTitle('Erreur ❌')
      .setDescription(message);
  }

  static createSuccessEmbed(message) {
    return this.createBaseEmbed()
      .setTitle('Succès ✅')
      .setDescription(message);
  }
}

module.exports = EmbedBuilderUtil;