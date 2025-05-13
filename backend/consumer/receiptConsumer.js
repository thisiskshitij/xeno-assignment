// consumer/consumerreceipt.js
require('dotenv').config({ path: '../.env' }); // Load environment variables (including DB connection)
// require('dotenv').config({ path: './backend/.env' }); // Load environment variables (including DB connection)

const mongoose = require('mongoose');
const CommunicationLog = require('../models/CommunicationLog'); // Need to update logs
const Campaign = require('../models/Campaign'); // <-- **ADD THIS IMPORT** - Need to update campaigns

// Import the Google Cloud Pub/Sub client library
const { PubSub } = require('@google-cloud/pubsub');

// --- **YOUR GOOGLE CLOUD PROJECT ID GOES HERE** ---
// Find your Project ID in the Google Cloud Console or in your service account key JSON file.
const GOOGLE_CLOUD_PROJECT_ID = 'crm-project-459422'; // <-- **REPLACE 'YOUR_GOOGLE_CLOUD_PROJECT_ID' with your ACTUAL Project ID**
// --- **END OF PROJECT ID CONFIG** ---


// Initialize Pub/Sub client
try {
    const pubSubClient = new PubSub({ projectId: GOOGLE_CLOUD_PROJECT_ID });
    console.log('[Consumer] Pub/Sub Client initialized with Project ID.'); // Log

    // Define your Pub/Sub Subscription Name
    // This should match the Subscription ID you created in the Google Cloud Console
    const PUBSUB_SUBSCRIPTION_NAME = 'delivery-receipts-topic-sub'; // <-- **Replace with your actual Subscription ID**
    console.log(`[Consumer] Using Pub/Sub Subscription: ${PUBSUB_SUBSCRIPTION_NAME}.`); // Log


    // Get a reference to the subscription
    const subscription = pubSubClient.subscription(PUBSUB_SUBSCRIPTION_NAME);
    console.log(`[Consumer] Pub/Sub Subscription reference obtained for ${PUBSUB_SUBSCRIPTION_NAME}.`); // Log


    // Database Connection (Need to connect the consumer process to the DB)
    // Ensure your MongoDB connection string is available via environment variables
    // (e.g., in a .env file at the backend root, loaded by dotenv)
    const MONGODB_URI = process.env.MONGODB_URI; // <-- Make sure you have this env var

    if (!MONGODB_URI) {
        console.error('Consumer: FATAL ERROR: MONGODB_URI environment variable is not defined.');
        // Don't proceed without DB connection
        // If already connected, this won't happen, but good check on startup
    } else {
        mongoose.connect(MONGODB_URI)
            .then(() => console.log('Consumer: Connected to MongoDB...'))
            .catch(err => console.error('Consumer: Could not connect to MongoDB...', err));
    }


    // --- Batch Processing Configuration ---
    const BATCH_SIZE = 10; // Process updates in batches of 10 messages
    const BATCH_TIMEOUT = 5000; // Or process after 5 seconds if batch size isn't reached

    let messageBatch = []; // Array to hold messages for the current batch
    let batchTimer = null; // Timer for the batch timeout


    // --- Function to Process a Batch ---
    const processBatch = async () => {
        if (messageBatch.length === 0) {
            return; // Nothing to process
        }

        console.log(`[Consumer] Processing batch of ${messageBatch.length} delivery receipts...`);

        const currentBatch = [...messageBatch]; // Process a copy of the current batch
        messageBatch = []; // Clear the batch immediately

        // Clear the timer as we are processing now
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }


        // Prepare bulkWrite operations for CommunicationLogs
        const bulkOperations = currentBatch.map(message => {
            const receipt = JSON.parse(message.data.toString()); // Parse the message data (which is a Buffer)

            // Map vendor status to our internal status
            const internalStatus = receipt.status?.toUpperCase() === 'SUCCESS' ? 'SENT' : 'FAILED';

            // Define the update fields for the CommunicationLog
            let updateFields = {
                status: internalStatus,
                updatedAt: new Date() // Always update updatedAt
            };

            if (internalStatus === 'SENT') {
                updateFields.deliveredAt = new Date();
                if (receipt.vendorMessageId) updateFields.vendorMessageId = receipt.vendorMessageId;
            } else { // Status is FAILED
                updateFields.failedAt = new Date();
                if (receipt.errorReason) updateFields.failureReason = receipt.errorReason;
            }

            // Create an updateOne operation for bulkWrite
            return {
                updateOne: {
                    filter: { _id: receipt.logId }, // Find the log entry by its _id (logId from the receipt)
                    update: { $set: updateFields }, // Set the updated fields
                    // We only want to update logs that are still PENDING, in case a duplicate comes in.
                    // However, for this simple simulation, updating regardless might be okay.
                    // Let's add the PENDING check for robustness.
                    filter: { _id: receipt.logId, status: 'PENDING' }, // Only update if currently PENDING
                    update: { $set: updateFields },
                    upsert: false
                }
            };
        }).filter(op => op !== null); // Filter out any null ops if validation failed


        if (bulkOperations.length === 0) {
            console.log('[Consumer] No valid bulk operations in this batch.');
            // Acknowledge the original messages even if no valid ops were created from them
            currentBatch.forEach(message => message.ack());
            console.log(`[Consumer] Acknowledged ${currentBatch.length} messages (no valid ops).`);
            return;
        }


        try {
            // Perform the bulk database update for CommunicationLogs
            const result = await CommunicationLog.bulkWrite(bulkOperations);
            console.log(`[Consumer] CommunicationLog bulk write result - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);


            // --- **ADD CAMPAIGN UPDATE LOGIC HERE** ---
            // Identify unique campaign IDs in the batch
            const affectedCampaignIds = [...new Set(currentBatch.map(message => JSON.parse(message.data.toString()).campaignId).filter(id => id))]; // Extract unique campaignIds


            for (const campaignId of affectedCampaignIds) {
                try {
                    // Find the campaign document
                    const campaign = await Campaign.findById(campaignId);
                    if (!campaign) {
                        console.warn(`[Consumer] Campaign with ID ${campaignId} not found while processing batch. Skipping campaign update.`);
                        continue; // Skip to the next affected campaign
                    }

                    // Re-query ALL logs for this campaign to get the accurate counts
                    const allLogsForCampaign = await CommunicationLog.find({ campaignId: campaign._id });
                    const currentSentCount = allLogsForCampaign.filter(l => l.status === 'SENT').length;
                    const currentFailedCount = allLogsForCampaign.filter(l => l.status === 'FAILED').length;
                    const currentPendingCount = allLogsForCampaign.filter(l => l.status === 'PENDING').length;

                    console.log(`[Consumer] Campaign ${campaign._id} - Recalculated Counts: Sent: ${currentSentCount}, Failed: ${currentFailedCount}, Pending: ${currentPendingCount}`);

                    // Update campaign counts and status
                    campaign.sentCount = currentSentCount;
                    campaign.failedCount = currentFailedCount;

                    // Update campaign status only if all logs are processed
                    if (currentPendingCount === 0) {
                        campaign.status = 'COMPLETED'; // Mark campaign as completed
                        campaign.completedAt = new Date(); // Set completion time
                        console.log(`[Consumer] Campaign ${campaign._id} - All logs processed. Marking as COMPLETED.`);
                    } else {
                        // Keep processing status if there are still pending logs
                        // Avoid changing status if it was already FAILED due to an earlier critical error
                        if (campaign.status !== 'FAILED') {
                            campaign.status = 'PROCESSING_MESSAGES'; // Or PROCESSING_WITH_PENDING
                        }
                        console.log(`[Consumer] Campaign ${campaign._id} - Still ${currentPendingCount} pending logs.`);
                    }

                    await campaign.save(); // Save the updated campaign document
                    console.log(`[Consumer] Campaign ${campaign._id} counts and status updated.`);


                } catch (campaignUpdateError) {
                    console.error(`[Consumer] Error updating Campaign ${campaignId} after processing batch:`, campaignUpdateError);
                    // This error means the Campaign update failed, but the CommunicationLogs were updated.
                    // The messages were already acknowledged. This scenario needs monitoring.
                }
            }
            // --- **END ADD CAMPAIGN UPDATE LOGIC HERE** ---


            // Acknowledge messages only after successful database updates for both logs and campaigns
            currentBatch.forEach(message => message.ack());
            console.log(`[Consumer] Acknowledged ${currentBatch.length} messages.`);


        } catch (dbError) {
            console.error('[Consumer] Error performing bulk write for CommunicationLogs:', dbError);
            // If the initial bulkWrite on logs fails, we log the error and acknowledge the messages
            // so they don't block the queue indefinitely. Data loss for this batch is possible.
            currentBatch.forEach(message => message.ack());
            console.warn(`[Consumer] Acknowledged ${currentBatch.length} messages despite bulk write error.`);

        }
    };

    // --- Function to Trigger Batch Processing (Debounced/Throttled) ---
    const triggerBatchProcess = () => {
        // Clear the existing timer if any
        if (batchTimer) {
            clearTimeout(batchTimer);
        }
        // Set a new timer to process the batch after BATCH_TIMEOUT
        batchTimer = setTimeout(processBatch, BATCH_TIMEOUT);
    };


    // --- Subscribe to the Pub/Sub Subscription ---
    const listenForMessages = () => {
        console.log(`[Consumer] Listening for messages on subscription ${subscription.name}`);

        // This event handler is called for each new message received
        subscription.on('message', message => {
            // Message object contains data (Buffer), messageId, attributes, etc.
            console.log(`[Consumer] Received message ${message.id} for log ${message.data.toString()}`);

            // Add message to the current batch
            messageBatch.push(message);

            // Check if batch size is reached
            if (messageBatch.length >= BATCH_SIZE) {
                console.log(`[Consumer] Batch size ${BATCH_SIZE} reached. Processing batch immediately.`);
                // If batch size is reached, process immediately
                processBatch(); // processBatch will clear the timer itself
            } else {
                // If batch size is not reached, trigger the timeout timer
                triggerBatchProcess();
            }
        });

        // Handle errors on the subscription
        subscription.on('error', error => {
            console.error('[Consumer] Subscription error:', error);
            // Mongoose connection errors might also surface here if DB goes down.
            // Implement reconnection logic if needed.
        });
    };

    // Start listening for messages
    if (MONGODB_URI) { // Only start listening if MONGODB_URI was found and connection initiated
        listenForMessages();
    }


} catch (initializationError) {
    // Handle errors during client, topic, or subscription initialization
    console.error('[Consumer] FATAL ERROR: Failed to initialize Pub/Sub consumer:', initializationError);
    // This is a critical error, the consumer process cannot start.
    // process.exit(1); // Exit on critical initialization error
}


// Handle graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
    console.log('Consumer: Received SIGINT. Closing subscription...');
    // Process any remaining messages in the batch before shutting down
    if (messageBatch.length > 0) {
        console.log(`[Consumer] Processing final batch of ${messageBatch.length} messages before shutdown.`);
        await processBatch(); // Process the final batch
    }
    try {
        await subscription.close(); // Close the subscription gracefully
        console.log('Consumer: Pub/Sub subscription closed.');
    } catch (closeError) {
        console.error('Consumer: Error closing subscription:', closeError);
    }

    try {
        await mongoose.disconnect(); // Disconnect from MongoDB
        console.log('Consumer: MongoDB connection closed.');
    } catch (disconnectError) {
        console.error('Consumer: Error disconnecting from MongoDB:', disconnectError);
    }

    console.log('Consumer: Exiting.');
    process.exit(0);
});
