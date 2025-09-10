class Logger {
  static formatDate(date) {
    // Format français pour les logs : "18/12/2024 09:43:08"
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ''); // Supprime la virgule entre la date et l'heure
  }

  static log(message, context = '') {
    const timestamp = this.formatDate(new Date());
    console.log(`[${timestamp}] ${context ? `[${context}] ` : ''}${message}`);
  }

  static error(error, context = '') {
    const timestamp = this.formatDate(new Date());
    console.error(`[${timestamp}] ${context ? `[${context}] ` : ''}Error:`, error.stack || error);
  }

  static command(user, commandName, options = {}) {
    this.log(`Command "${commandName}" executed by ${user.tag} (${user.id})`, 'Command');
    if (Object.keys(options).length > 0) {
      this.log(`Options: ${JSON.stringify(options)}`, 'Command');
    }
  }
}

module.exports = Logger;
