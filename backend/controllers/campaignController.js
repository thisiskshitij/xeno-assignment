// backend/controllers/campaignController.js
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');
const axios = require('axios'); // axios is already imported

const DUMMY_VENDOR_API_URL = 'http://localhost:3000/api/dummyVendor/send';
// const DELIVERY_RECEIPT_API_URL = 'http://localhost:3000/api/delivery-receipts'; // No longer needed directly here


const processCampaign = async (campaignId) => {
  try {
    console.log(`[CampaignController] Starting processing for campaign ID: ${campaignId}`); // <-- Log 1

    const campaign = await Campaign.findById(campaignId);

    // --- CRITICAL CHECK: Ensure campaign exists ---
    if (!campaign) {
        console.error(`[CampaignController] CRITICAL ERROR: Campaign with ID ${campaignId} not found.`); // <-- Log 2
        // Mark campaign status as FAILED because we can't process it without the campaign object
        try {
            // Use findByIdAndUpdate with { new: true } to get the updated document, though not strictly necessary here
            await Campaign.findByIdAndUpdate(campaignId, {
                status: 'FAILED',
                completedAt: new Date(),
                failureReason: 'Campaign record not found during processing start'
            });
            console.error(`[CampaignController] Campaign ${campaignId} status updated to FAILED due to not found.`); // <-- Log 3
        } catch (updateError) {
            console.error(`[CampaignController] FATAL: Failed to update campaign ${campaignId} status to FAILED when not found:`, updateError); // <-- Log 4
        }
        return; // Stop processing the campaign immediately
    }
    // --- END CRITICAL CHECK ---


    // Check initial status (Now happens AFTER ensuring campaign exists)
    if (campaign.status !== 'INITIATED') {
      console.warn(`[CampaignController] Process Campaign Skipped: Campaign ${campaignId} is not in INITIATED status (${campaign?.status}).`); // <-- Log 5
      // Optional: Update status to indicate it was skipped if needed
      // await Campaign.findByIdAndUpdate(campaignId, { status: 'SKIPPED_NOT_INITIATED' });
      return;
    }

    // Update status to processing (Now happens AFTER ensuring campaign exists and is INITIATED)
    await Campaign.findByIdAndUpdate(campaignId, { status: 'PROCESSING_MESSAGES' });
    console.log(`[CampaignController] Campaign ${campaignId} status updated to PROCESSING_MESSAGES.`); // <-- Log 6


    const pendingLogs = await CommunicationLog.find({
        campaignId: campaignId,
        status: 'PENDING'
    }).populate('customerId');

    console.log(`[CampaignController] Found ${pendingLogs.length} pending log entries to process.`); // <-- Log 7

    if (pendingLogs.length === 0) {
        console.log(`[CampaignController] No pending logs found for campaign ${campaignId}. Marking as completed.`); // <-- Log 8
        // Update campaign status to COMPLETED immediately if no logs
        await Campaign.findByIdAndUpdate(campaignId, {
            status: 'COMPLETED',
            completedAt: new Date(),
            sentCount: 0, // Ensure counts are 0 if no logs processed
            failedCount: 0
        });
        return; // Exit if no logs
    }


    // --- Loop to trigger sending via dummy vendor ---
    for (const log of pendingLogs) {
        try {
            const customer = log.customerId;

            if (!customer) {
                 console.error(`[CampaignController] Customer not found for log entry ${log._id}. Cannot trigger send.`); // <-- Log 9
                 // Mark log as failed immediately if customer data is missing
                 await CommunicationLog.findByIdAndUpdate(log._id, {
                     status: 'FAILED',
                     failureReason: 'Customer data missing for sending',
                     failedAt: new Date()
                 });
                 continue; // Skip to the next log if customer is missing
            }

            // Generate personalized message content
            // We know 'campaign' is not null here due to the check before the loop
            if (!campaign.messageTemplate) { // <-- Safer check now
                 console.error(`[CampaignController] Message template missing for campaign ${campaignId} (log ${log._id}). Cannot personalize message.`); // <-- Log 10
                 await CommunicationLog.findByIdAndUpdate(log._id, {
                     status: 'FAILED',
                     failureReason: 'Campaign message template missing',
                     failedAt: new Date()
                 });
                 continue; // Skip to the next log
            }
            const personalizedMessage = campaign.messageTemplate.replace('{{name}}', customer.name || 'Customer');
            console.log(`[CampaignController] Personalized message for log ${log._id} (${customer.name}): "${personalizedMessage}"`); // <-- Log 11

             // Update the log entry with the personalized message content before sending attempt (Status is still PENDING)
             await CommunicationLog.findByIdAndUpdate(log._id, {
                 messageContent: personalizedMessage, // Save personalized message
             });
             console.log(`[CampaignController] Log ${log._id} updated with personalized message.`); // <-- Log 12


            // Call the dummy vendor API
            console.log(`[CampaignController] Attempting axios.post to ${DUMMY_VENDOR_API_URL} for log ${log._id}`); // <-- Log 13

            // We await axios call here. The Delivery Receipt API handles the asynchronous status update.
             const axiosResponse = await axios.post(DUMMY_VENDOR_API_URL, {
                email: customer.email, // Assuming dummy vendor uses email
                message: personalizedMessage,
                logId: log._id.toString() // Send log ID for the vendor to include in the receipt
            });

            console.log(`[CampaignController] Axios post successful for log ${log._id}. Status: ${axiosResponse.status}`); // <-- Log 14
             // We don't update log status to SENT/FAILED here. That happens when the delivery receipt arrives.
            console.log(`[CampaignController] Triggered dummy vendor for log ${log._id}. Waiting for asynchronous receipt.`); // <-- Log 15


        } catch (logProcessingError) {
    /*  */
            // <-- NEW LOG/ <-- NEW LOG// <-- Log 16 (Error from axios call)
             // Mark log as failed if triggering the vendor itself fails (e.g., vendor API is down, network error)
             try {
                  await CommunicationLog.findByIdAndUpdate(log._id, {
                      status: 'FAILED', // Mark as failed because we couldn't even call the vendor
                      failedAt: new Date(),
                      failureReason: `Trigger error: ${logProcessingError.message || logProcessingError}` // Capture error message
                  });
                 console.log(`[CampaignController] Log ${log._id} status updated to FAILED due to trigger error.`); // <-- Log 17
             } catch (updateError) {
                 console.error(`[CampaignController] FATAL: Failed to update log ${log._id} after trigger error:`, updateError); // <-- Log 18
             }
        }
    }

    console.log(`[CampaignController] All dummy vendor send triggers sent for campaign ${campaignId}.`); // <-- Log 19

    // --- Final Campaign Status Update ---
    console.log(`[CampaignController] Simulating waiting for asynchronous delivery receipts...`); // <-- Log 20
    await new Promise(resolve => setTimeout(resolve, 3000));
     console.log(`[CampaignController] Simulation wait finished.`); // <-- Log 21


    // Re-query the logs to get their final status after the simulated wait
    console.log(`[CampaignController] Re-querying logs to check final statuses...`); // <-- Log 22
    const finalProcessedLogs = await CommunicationLog.find({ campaignId: campaignId });
    const finalSentCount = finalProcessedLogs.filter(log => log.status === 'SENT').length;
    const finalFailedCount = finalProcessedLogs.filter(log => log.status === 'FAILED').length;
    const finalPendingCount = finalProcessedLogs.filter(log => log.status === 'PENDING').length;

    console.log(`[CampaignController] Final Log Counts: Sent: ${finalSentCount}, Failed: ${finalFailedCount}, Pending: ${finalPendingCount}`); // <-- Log 23


    await Campaign.findByIdAndUpdate(campaignId, {
        status: finalPendingCount === 0 ? 'COMPLETED' : 'COMPLETED_WITH_PENDING', // Mark completed only if no pending logs
        sentCount: finalSentCount,
        failedCount: finalFailedCount,
        completedAt: new Date() // Set completion time regardless if processing finished
    });

    console.log(`[CampaignController] Campaign ${campaignId} processing finished. Final Status: ${finalPendingCount === 0 ? 'COMPLETED' : 'COMPLETED_WITH_PENDING'}, Sent: ${finalSentCount}, Failed: ${finalFailedCount}`); // <-- Log 24


  } catch (error) {
    console.error(`[CampaignController] Top-level unexpected error in processCampaign ${campaignId}:`, error); // <-- Log 25
    // Handle the error - maybe set campaign status to 'FAILED'
    try {
         await Campaign.findByIdAndUpdate(campaignId, { status: 'FAILED', completedAt: new Date(), failureReason: `Unexpected error during processing: ${error.message || error}` });
         console.error(`[CampaignController] Campaign ${campaignId} status updated to FAILED due to unexpected error.`); // <-- Log 26
     } catch (updateError) {
         console.error(`[CampaignController] FATAL: Failed to update campaign ${campaignId} status to FAILED:`, updateError); // <-- Log 27
     }
  }

  console.log(`[CampaignController] Exiting processCampaign for Campaign ID: ${campaignId}`); // <-- Log 28
};

// Export the function
module.exports = processCampaign;