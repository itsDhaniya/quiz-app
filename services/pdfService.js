const pdfParse = require('pdf-parse');

class PDFService {
  async extractText(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      throw new Error('Failed to parse PDF: ' + error.message);
    }
  }
}

const pdfService = new PDFService();
module.exports = pdfService;