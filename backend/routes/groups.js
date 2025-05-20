const express = require('express');
const axios = require('axios');
require('dotenv').config(); // should be at the top of server.js


const router = express.Router();


// Helper function to get access token
async function getAccessToken(apiNameId, apiKey) {
  try {
    validateCredentials();
    
    console.log('Attempting to get access token with:');
    console.log('Customer ID:', process.env.CUSTOMER_ID);
    console.log('API Name ID:', apiNameId);
    
    const payload = {
      customerId: process.env.CUSTOMER_ID.trim(),
      apiNameId: Number(apiNameId),
      apiKey: apiKey.trim()
    };

    const response = await axios.post(
      'https://apiv2.speedexam.net/api/Token/Get-Access-Token',
      payload,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 8000
      }
    );

    if (!response.data?.token) {
      throw new Error('Token not found in response');
    }

    return response.data.token;
  } catch (error) {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      requestPayload: {
        customerId: process.env.CUSTOMER_ID,
        apiNameId,
        apiKey: '***masked***'
      }
    };
    
    console.error('Access token request failed:', JSON.stringify(errorDetails, null, 2));
    
    const err = new Error(`Authentication failed: ${error.message}`);
    err.status = error.response?.status || 500;
    err.details = errorDetails;
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