// utils/generateContract.js
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const generateContract = (data) => {
  try {
    const filePath = path.resolve(__dirname, './contract-template.docx');
    const content = fs.readFileSync(filePath, 'binary');

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(data);

    try {
        doc.render();
      } catch (error) {
        const e = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          properties: error.properties,
        };
        console.log('🔴 DOCXTEMPLATER ERROR:', JSON.stringify(e, null, 2));
        throw error;
      }
      

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    return buffer;
  } catch (error) {
    console.error('🛑 generateContract error:', error);
    throw error;
  }
};

module.exports = generateContract;
