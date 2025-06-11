// routes/contract.js
const express = require('express');
const router = express.Router();
const generateContract = require('./generateContract');

router.post('/generate', (req, res) => {
    const { full_name, email, phone_no } = req.body;
  
    const data = {
      full_name: full_name || 'Test User',
      email: email || 'test@example.com',
      phone_no: phone_no || '1234567890',
      agreement_date: new Date().toLocaleDateString(),
    };
  
    try {
      const buffer = generateContract(data);
  
      console.log('✅ Contract buffer length:', buffer.length); // <- Should log something big
  
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Contract_${data.full_name}.docx`
      );
  
      res.send(buffer);
    } catch (err) {
      console.error('❌ Contract generation error:', err); // <- You MUST see this
      res.status(500).send('Could not generate contract');
    }
  });
  
  

module.exports = router;
