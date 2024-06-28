const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/verify-ios', async (req, res) => {
    console.log('Request body:', req.body);
    const { receiptData } = req.body;
    console.log('Receipt data:', receiptData);

    if (!receiptData) {
        return res.status(400).json({ error: 'Receipt data is required' });
    }

    // const verifyReceiptURL = 'https://buy.itunes.apple.com/verifyReceipt'; // Production URL
    const verifyReceiptURL = 'https://sandbox.itunes.apple.com/verifyReceipt'; // Sandbox URL

    const payload = {
        'receipt-data': receiptData,
        'password': process.env.IOS_SECRET,
    };

    try {
        const response = await axios.post(verifyReceiptURL, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const responseData = response.data;

        if (responseData.status === 0) {
            res.json({ success: true, data: responseData });
        } else {
            res.status(400).json({ success: false, error: `Invalid receipt. Status code: ${responseData.status}` });
        }
    } catch (error) {
        console.error('Error verifying receipt:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

const checkSubscription = async (packageName, subscriptionId, token) => {
  try {
    const res = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token,
    });
    return res?.data;
  } catch (error) {
    console.log(error);
  }

  return null;
};


app.post('/verify-android', async (req, res) => {
  try {
    const { packageName, subscriptionId, token } = req.body;
    const subscriptionRes = await checkSubscription(packageName, subscriptionId, token);
    if (subscriptionRes) {
      res.status(200).json({ success: true, data: subscriptionRes });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
