const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');


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

// Get Group List
router.get('/', async (req, res, next) => {
  try {
    const token = await getAccessToken(5, process.env.API_KEY_GET_GROUP_LIST);
    const url = 'https://apiv2.speedexam.net/api/Group/Get%20Group%20List?Page_no=1&Page_size=100';
    const authHeader = `Bearer ${token}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
    // Parse the result string into an array
    const groups = JSON.parse(response.data.result || '[]');
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// Create Group
router.post('/', async (req, res, next) => {
  try {
    const { groupname, description } = req.body;
    if (!groupname) {
      const err = new Error('Group name is required');
      err.status = 400;
      throw err;
    }
    const token = await getAccessToken(4, process.env.API_KEY_CREATE_GROUP);
    const url = 'https://apiv2.speedexam.net/api/Group/Create%20a%20New%20Group';
    const response = await axios.post(
      url,
      {
        groupName: groupname,
        groupDescription: description || '',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;