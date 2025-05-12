require('dotenv').config();
// consumer/consumerreceipt.js
const { PubSub } = require('@google-cloud/pubsub');
const mongoose = require('mongoose'); // Need Mongoose to interact with DB
const CommunicationLog = require('./models/CommunicationLog'); // Need Log model
const Campaign = require('./models/Campaign'); // Need Campaign model

// Load environment variables from .env file (if not already loaded)
require('dotenv').config({ path: './backend/.env' }); // Adjust path if needed

// MongoDB Connection (Ensure your MongoDB connection details are in the .env file)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Consumer: MongoDB Connected Successfully!'))
  .catch(err => console.error('Consumer: MongoDB connection error:', err));


// --- **YOUR GOOGLE CLOUD PROJECT ID GOES HERE** ---
const GOOGLE_CLOUD_PROJECT_ID = 'crm-project-459422'; // <-- **REPLACE with your ACTUAL Project ID**
// --- **END OF PROJECT ID CONFIG** ---

// Pub/Sub Configuration
const PUBSUB_TOPIC_NAME = 'delivery-receipts-topic'; // <-- **Replace with your actual Topic ID**
const PUBSUB_SUBSCRIPTION_NAME = 'delivery-receipts-topic-sub'; // <-- **Replace with your actual Subscription ID**


// Initialize Pub/Sub client
try {
    const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID });
    console.log('[Consumer] Pub/Sub Client initialized with Project ID.');

    // Get a reference to the subscription
    const subscription = pubSubClient.subscription(PUBSUB_SUBSCRIPTION_NAME);
    console.log(`[Consumer] Pub/Sub Subscription reference obtained for ${PUBSUB_SUBSCRIPTION_NAME}.`);


    // --- Message Handler ---
    const messageHandler = async message => {
      console.log(`[Consumer] Received message ${message.id} for log ${message.attributes.logId || 'N/A'}:`); // Log received message ID
      console.log('[Consumer] Message data:', message.data.toString()); // Log message data

      try {
          // Parse the receipt data from the message
          const receiptData = JSON.parse(message.data.toString());
          const { logId, status, vendorMessageId, errorReason } = receiptData;

          console.log(`[Consumer] Processing receipt for log ID: ${logId}, Status: ${status}`); // Log processed data

          // 1. Find and update the CommunicationLog document
          const log = await CommunicationLog.findById(logId);
          if (!log) {
              console.warn(`[Consumer] Communication log with ID ${logId} not found. Skipping update.`); // Log if log not found
              message.ack(); // Acknowledge the message even if log not found
              return;
          }

          // Update log status based on receipt status
          let newStatus;
          if (status === 'success') {
              newStatus = 'SENT';
          } else if (status === 'failure') {
              newStatus = 'FAILED';
          } else {
              console.warn(`[Consumer] Unknown status '${status}' for log ${logId}. Keeping as PENDING.`); // Handle unknown status
              message.ack(); // Acknowledge unknown status messages
              return; // Do not update if status is unknown
          }

          // Only update if the new status is different from the current one (prevents unnecessary writes)
           if (log.status === newStatus) {
                console.log(`[Consumer] Log ${logId} already has status ${newStatus}. Skipping update.`);
                message.ack(); // Acknowledge if already updated
                return;
           }


          // Update the log document
          log.status = newStatus;
          log.vendorMessageId = vendorMessageId; // Save vendor's ID if available
          log.failureReason = errorReason; // Save failure reason if available
          log.processedAt = new Date(); // Record when the consumer processed it
          await log.save(); // Save the updated log entry
          console.log(`[Consumer] Communication log ${logId} status updated to ${newStatus}.`); // Log successful log update

          // 2. Update the Campaign document counts and status
          const campaign = await Campaign.findById(log.campaignId);
          if (!campaign) {
              console.error(`[Consumer] Campaign with ID ${log.campaignId} not found for log ${logId}. Cannot update campaign counts.`); // Log if campaign not found
              message.ack(); // Acknowledge the message even if campaign not found (log was updated)
              return;
          }

          // Recalculate counts for the campaign based on current log statuses
          const allLogsForCampaign = await CommunicationLog.find({ campaignId: log.campaignId });
          const currentSentCount = allLogsForCampaign.filter(l => l.status === 'SENT').length;
          const currentFailedCount = allLogsForCampaign.filter(l => l.status === 'FAILED').length;
          const currentPendingCount = allLogsForCampaign.filter(l => l.status === 'PENDING').length;

          console.log(`[Consumer] Campaign ${campaign._id} - Current Counts: Sent: ${currentSentCount}, Failed: ${currentFailedCount}, Pending: ${currentPendingCount}`);

          // Update campaign counts
          campaign.sentCount = currentSentCount;
          campaign.failedCount = currentFailedCount;

          // Update campaign status only if all logs are processed
          if (currentPendingCount === 0) {
              campaign.status = 'COMPLETED'; // Mark campaign as completed
              campaign.completedAt = new Date(); // Set completion time
              console.log(`[Consumer] Campaign ${campaign._id} - All logs processed. Marking as COMPLETED.`);
          } else {
              campaign.status = 'PROCESSING_MESSAGES'; // Keep processing status if there are still pending logs
               console.log(`[Consumer] Campaign ${campaign._id} - Still ${currentPendingCount} pending logs.`);
          }

          await campaign.save(); // Save the updated campaign document
          console.log(`[Consumer] Campaign ${campaign._id} counts and status updated.`);


          // 3. Acknowledge the message only AFTER successfully processing and updating DB
          message.ack(); // Acknowledge the message
          console.log(`[Consumer] Acknowledged message ${message.id} for log ${logId}.`); // Log acknowledgment


      } catch (error) {
          console.error(`[Consumer] Error processing message ${message.id} for log ${message.attributes.logId || 'N/A'}:`, error); // Log processing error
          // IMPORTANT: Do NOT message.ack() here if you want Pub/Sub to retry the message
          // If the error is transient, Pub/Sub will redeliver it.
          // If the error is permanent, it might go to a Dead-Letter Topic if configured.
          // For this assignment, maybe log and let Pub/Sub retry or manually handle.
          // message.nack(); // Optional: Negatively acknowledge if you want to explicitly tell Pub/Sub to redeliver sooner (be careful with error loops)
      }
    };

    // --- Start Listening for Messages ---
    subscription.on('message', messageHandler);

    // Handle subscription errors
    subscription.on('error', error => {
      console.error('[Consumer] Subscription error:', error);
      // Handle error, maybe reconnect or exit
      // process.exit(1); // Exit on critical subscription error
    });

    console.log(`[Consumer] Started Pub/Sub consumer. Subscribing to ${PUBSUB_SUBSCRIPTION_NAME} on topic ${PUBSUB_TOPIC_NAME}...`);


} catch (initializationError) {
    // Handle errors during client, topic, or subscription initialization
    console.error('[Consumer] FATAL ERROR: Failed to initialize Pub/Sub consumer:', initializationError);
    // This is a critical error, the consumer process cannot start.
     // process.exit(1); // Exit on critical initialization error
}


// You might need to keep the Node.js process alive for the consumer to run indefinitely.
// You can use tools like PM2 or add a simple infinite loop or event listener if running manually.
// process.stdin.resume(); // Keep process alive (basic)