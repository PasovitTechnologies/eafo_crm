const express = require('express');
const axios = require('axios');
const Candidate = require('../models/Candidate');

const router = express.Router();

// Helper: Generate Access Token
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

// Helper: Strong 8-char Password
function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + digits + special;

  let password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = 4; i < 8; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }

  return password.sort(() => 0.5 - Math.random()).join('');
}

// Helper: Check candidate existence
async function checkCandidateExists(email) {
  const token = await getAccessToken(7, process.env.API_KEY_GET_CANDIDATE_LIST);
  let page = 1;
  let allCandidates = [];

  while (true) {
    const url = `https://apiv2.speedexam.net/api/Employee/Get%20Candidate%20List?Page_no=${page}&Page_size=100`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const candidates = JSON.parse(response.data.result || '[]');
    if (candidates.length === 0) break;
    allCandidates.push(...candidates);
    page += 1;
  }

  const found = allCandidates.find(c => c.email.toLowerCase() === email.toLowerCase());
  return found ? { exists: true, candidateId: found.candidateid } : { exists: false };
}

// Helper: Add candidate to group
async function addCandidateToGroup(candidateId, groupId, token) {
  const url = 'https://apiv2.speedexam.net/api/Employee/Add-Remove-Candidate-Groups';
  const payload = {
    candidateId: parseInt(candidateId),
    groupIDs: [parseInt(groupId)],
    candidateUserName: null,
    action: 1,
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

// GET: Candidates by group
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

// GET: All candidates system-wide
router.get('/all', async (req, res, next) => {
  try {
    const token = await getAccessToken(7, process.env.API_KEY_GET_CANDIDATE_LIST);
    let page = 1;
    let allCandidates = [];

    while (true) {
      const url = `https://apiv2.speedexam.net/api/Employee/Get%20Candidate%20List?Page_no=${page}&Page_size=100`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const candidates = JSON.parse(response.data.result || '[]');
      if (candidates.length === 0) break;
      allCandidates.push(...candidates);
      page += 1;
    }

    res.json(allCandidates);
  } catch (error) {
    next(error);
  }
});

// POST: Bulk create candidates
router.post('/bulk', async (req, res, next) => {
  try {
    const { candidates } = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      const err = new Error('Candidates array is required');
      err.status = 400;
      throw err;
    }

    const token = await getAccessToken(6, process.env.API_KEY_CREATE_CANDIDATE);
    const groupToken = await getAccessToken(15, process.env.API_KEY_ADD_REMOVE_CANDIDATE_GROUPS);

    const created = [];
    const failed = [];

    for (const candidate of candidates) {
      const { groupid, firstName, lastName, email } = candidate;

      try {
        const { exists, candidateId } = await checkCandidateExists(email);

        if (exists) {
          await addCandidateToGroup(candidateId, groupid, groupToken);

          const updated = await Candidate.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
              $set: {
                firstName,
                lastName,
                candidateId,
                username: email,
                updatedAt: new Date(),
              },
              $addToSet: { groups: parseInt(groupid) },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, new: true }
          );

          created.push(updated.toObject());
        } else {
          const password = generateStrongPassword();
          const payload = {
            firstName,
            lastName,
            email,
            userName: email,
            password,
            groupsequenceId: parseInt(groupid),
            isActive: "True"
          };

          const response = await axios.post(
            'https://apiv2.speedexam.net/api/Employee/Create%20a%20New%20Candidate',
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const result = JSON.parse(response.data.result || '{}');
          if (result.Statuscode !== 200) {
            failed.push(email);
            continue;
          }

          const candidateData = new Candidate({
            email: email.toLowerCase(),
            candidateId: result.Result,
            firstName,
            lastName,
            username: email,
            password,
            groups: [parseInt(groupid)],
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await candidateData.save();
          created.push(candidateData.toObject());
        }
      } catch (err) {
        failed.push(email);
      }
    }

    res.status(201).json({
      message: 'Candidates processed',
      created,
      failed,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
