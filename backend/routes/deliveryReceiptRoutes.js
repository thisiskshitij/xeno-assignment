// backend/routes/deliveryReceiptRoutes.js
const express = require('express');
const router = express.Router();
// CommunicationLog model is not needed for this route, as processing happens in the consumer
// const CommunicationLog = require('../models/CommunicationLog');

// Import the Google Cloud Pub/Sub client library
const { PubSub } = require('@google-cloud/pubsub');

// --- **YOUR GOOGLE CLOUD PROJECT ID GOES HERE** ---
// Find your Project ID in the Google Cloud Console or in your service account key JSON file.
const GOOGLE_CLOUD_PROJECT_ID = 'crm-project-459422'; // <-- **REPLACE 'YOUR_GOOGLE_CLOUD_PROJECT_ID' with your ACTUAL Project ID**
// --- **END OF PROJECT ID CONFIG** ---


// Initialize Pub/Sub client
// The client automatically uses the GOOGLE_APPLICATION_CREDENTIALS environment variable for authentication.
// Ensure GOOGLE_APPLICATION_CREDENTIALS is correctly set in your backend environment!
// We explicitly provide the projectId here.
try {
    const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID }); // <-- Pass projectId here
    console.log('[DeliveryReceipts] Pub/Sub Client initialized with Project ID.'); // <-- Log 1

    // Define your Pub/Sub Topic Name
    // This should match the Topic ID you created in the Google Cloud Console
    const PUBSUB_TOPIC_NAME = 'delivery-receipts-topic'; // <-- **Replace with your actual Topic ID**
    console.log(`[DeliveryReceipts] Using Pub/Sub Topic: ${PUBSUB_TOPIC_NAME}.`); // <-- Log 2

    // Get a reference to the topic
    const topic = pubSubClient.topic(PUBSUB_TOPIC_NAME);
    console.log(`[DeliveryReceipts] Pub/Sub Topic reference obtained for ${PUBSUB_TOPIC_NAME}.`); // <-- Log 3


    // POST /api/delivery-receipts - Endpoint to receive status updates and publish to Pub/Sub
    // This route does NOT require authentication as it's called by the dummy vendor.
    router.post('/', async (req, res) => {
     try {
      console.log('[DeliveryReceipts] Received POST request to /api/delivery-receipts.'); // <-- Log 4
      // Expecting data like: { logId: '...', status: 'success'/'failure', vendorMessageId: '...', errorReason: '...' }
      const receiptData = req.body;
        console.log('[DeliveryReceipts] Request body:', receiptData); // <-- Log 5

      // Basic validation (still good practice to validate incoming data)
      if (!receiptData || !receiptData.logId || !receiptData.status) {
       console.warn('[DeliveryReceipts] Received invalid delivery receipt data: logId and status are required.', receiptData); // <-- Log 6
       return res.status(400).json({ message: 'Invalid delivery receipt data: logId and status are required' });
      }

      console.log(`[DeliveryReceipts] Received valid delivery receipt for Log ID: ${receiptData.logId}, Status: ${receiptData.status}. Publishing to Pub/Sub.`); // <-- Log 7


      // --- Publish the receipt data to Pub/Sub ---

      // Pub/Sub messages require data to be a Buffer
      const dataBuffer = Buffer.from(JSON.stringify(receiptData));
        console.log('[DeliveryReceipts] Data buffered for publishing.'); // <-- Log 8


      // Publish the message to the topic. This returns a Promise.
      console.log(`[DeliveryReceipts] Attempting to publish message to topic ${PUBSUB_TOPIC_NAME}...`); // <-- Log 9
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`[DeliveryReceipts] Successfully published message to topic ${PUBSUB_TOPIC_NAME}. Message ID: ${messageId}`); // <-- Log 10


      // Respond to the vendor immediately (or after successful publish)
      res.status(200).json({ message: 'Delivery receipt received and queued for processing', messageId: messageId });
        console.log('[DeliveryReceipts] Sent 200 OK response to vendor.'); // <-- Log 11


     } catch (err) {
      // Handle errors during validation or publishing
        // THIS IS THE CRUCIAL LOG FOR DEBUGGING PUBSUB ISSUES
      console.error('[DeliveryReceipts] !!! ERROR !!! Error receiving or publishing delivery receipt:', err); // <-- Log 12
      res.status(500).json({ message: 'Failed to process delivery receipt', error: err.message });
        console.error('[DeliveryReceipts] Sent 500 error response to vendor.'); // <-- Log 13
     }
    });

    // Export the router
    module.exports = router;

} catch (initializationError) {
    // Handle errors during client or topic initialization
    console.error('[DeliveryReceipts] FATAL ERROR: Failed to initialize Pub/Sub client or topic:', initializationError); // <-- Log 14
    // This is a critical error, the route will not function.
    // You might want to make the server exit or enter a degraded state.
     // For now, just log the error.
}