const axios = require('axios');

class TelegramApi {
  constructor() {
    this.botToken = '8135466966:AAEgtEVnzhq0e73BORoLzxlY5vU2A4dAdKw';  // Replace with your actual bot token
    this.chat_id = null;
    this.text = null;
  }

  async sendMessage() {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: this.chat_id,
        text: this.text,
        parse_mode: 'HTML',  // Send as HTML formatted message
        disable_web_page_preview: true, // Optionally disable previews for links
      });

      return response.data;  // Return the response for logging or further use
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;  // Rethrow to handle the error properly in the calling code
    }
  }
}

module.exports = { TelegramApi };
