const express = require('express');
const router = express.Router();
const axios = require('axios'); // Make sure axios is imported

const DELIVERY_RECEIPT_API_URL = 'http://localhost:3000/api/delivery-receipts'; // <-- Add this URL

router.post('/send', async (req, res) => { // <-- Make the handler async
  const { email, message, logId } = req.body;

  console.log(`--- Dummy Vendor API ---`);
  console.log(`Attempting to send to: ${email}`);
  console.log(`Message: "${message}"`);
  console.log(`Associated Log ID: ${logId}`);
  console.log(`------------------------`);

  // Simulate success or failure (~90% success rate)
  const success = Math.random() < 0.9;
  const vendorMessageId = 'dummy_' + Math.random().toString(36).substring(7); // Simulate a vendor message ID
  const vendorStatus = success ? 'success' : 'failure'; // Vendor's status representation
  const errorReason = success ? null : 'Simulated failure'; // Error reason if failed

  const receiptPayload = {
      logId: logId, // Send our log ID back
      status: vendorStatus, // Send the vendor's status
      vendorMessageId: vendorMessageId,
      errorReason: errorReason
  };

  try {
    // Call back the Delivery Receipt API on your backend
    console.log(`Dummy Vendor API: Calling Delivery Receipt API for log ${logId} with status ${vendorStatus}`);
    await axios.post(DELIVERY_RECEIPT_API_URL, receiptPayload);
    console.log(`Dummy Vendor API: Successfully called Delivery Receipt API for log ${logId}`);

    // Respond to the original sender (processCampaign in this case)
    // In a real scenario, this response might not be needed or would confirm receipt of the send request,
    // not the final delivery status. For this simulation, let's just confirm the dummy send attempt was processed.
    res.json({ message: `Send attempt processed for log ${logId}`, status: 'processed' });

  } catch (error) {
    console.error(`Dummy Vendor API: Failed to call Delivery Receipt API for log ${logId}:`, error.message);
     // Even if the callback fails, we might still respond to the original sender
    res.status(500).json({ message: `Send attempt processed, but failed to report status for log ${logId}`, error: error.message });
  }
});

module.exports = router;
