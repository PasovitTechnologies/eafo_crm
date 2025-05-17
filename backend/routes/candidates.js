const express = require('express');
const axios = require('axios');
const Candidate = require('../models/Candidate');
const router = express.Router();

// Helper function to get access token
async function getAccessToken(apiNameId, apiKey) {
  try {
    const response = await axios.post(
      'https://apiv2.speedexam.net/api/Token/Get-Access-Token',
      {
        customerId: process.env.CUSTOMER_ID,
        apiNameId,
        apiKey,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data['token'];
  } catch (error) {
    const err = new Error('Failed to generate access token');
    err.status = 401;
    throw err;
  }
}

// Helper function to generate a strong 8-character password
function generateStrongPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure at least one of each required type
  if (!/[A-Z]/.test(password)) password = password.slice(0, -1) + 'A';
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '1';
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '@';
  return password;
}

// Get Candidate List
router.get('/', async (req, res, next) => {
  try {
    const { groupid } = req.query;
    if (!groupid) {
      const err = new Error('Group ID is required');
      err.status = 400;
      throw err;
    }
    const token = await getAccessToken(7, process.env.API_KEY_GET_CANDIDATE_LIST);
    const url = `https://apiv2.speedexam.net/api/Employee/Get%20Candidate%20List?Groupid=${parseInt(groupid)}&Page_no=1&Page_size=100`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const candidates = JSON.parse(response.data.result || '[]');
    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + digits + special;

  let password = '';

  // Ensure at least one character of each required type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  // Fill remaining length with random chars
  for (let i = 4; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password characters to avoid predictable pattern
  password = password.split('').sort(() => 0.5 - Math.random()).join('');

  return password;
}



// Bulk Create Candidates
// Bulk Create Candidates
router.post('/bulk', async (req, res, next) => {
  try {
    const { candidates } = req.body;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      const err = new Error('Candidates array is required');
      err.status = 400;
      throw err;
    }

    const failed = [];
    const createdCandidates = [];
    const token = await getAccessToken(6, process.env.API_KEY_CREATE_CANDIDATE);

    for (const candidate of candidates) {
      const { groupid, firstName, lastName, email } = candidate;

      const password = generateStrongPassword();
      const username = email;

      try {
        const speedExamUrl = 'https://apiv2.speedexam.net/api/Employee/Create%20a%20New%20Candidate';
        const speedExamPayload = {
          firstName,
          lastName,
          email,
          userName: username,
          password,
          groupsequenceId: parseInt(groupid),
          isActive: "True",
        };

        const speedExamResponse = await axios.post(speedExamUrl, speedExamPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const speedExamResult = JSON.parse(speedExamResponse.data.result || '{}');

        if (speedExamResult.Statuscode !== 200) {
          console.error(`SpeedExam API error for ${email}:`, speedExamResult);
          failed.push(email);
          continue;
        }

        const candidateId = speedExamResult.Result;

        const candidateDoc = new Candidate({
          groupid: parseInt(groupid),
          candidateId: candidateId || null,
          firstName,
          lastName,
          username,
          password,
          createdAt: new Date(),
        });

        try {
          await candidateDoc.save();
          createdCandidates.push(candidateDoc.toObject());
        } catch (mongoErr) {
          console.error(`MongoDB save error for ${email}:`, mongoErr);
          failed.push(email);
        }

      } catch (err) {
        console.error(`Error creating candidate ${email}:`, err);
        failed.push(email);
      }
    }

    res.status(201).json({
      message: 'Candidates processed',
      created: createdCandidates,
      failed,
    });

  } catch (error) {
    next(error);
  }
});


module.exports = router;