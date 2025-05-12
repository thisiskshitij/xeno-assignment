const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a Communication Log entry (one record per message sent)
const communicationLogSchema = new Schema({
  // Link to the Campaign this message belongs to
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  // Link to the Customer the message was sent to
  customerId: {
    type: Schema.Types.ObjectId, // Reference to the Customer model
    ref: 'Customer', // The name of the Mongoose model
    required: true
  },
  messageContent: {
    type: String, // The exact personalized message sent
    required: true
  },
  status: {
    type: String, // e.g., 'PENDING', 'SENT', 'FAILED', 'DELIVERED'
    required: true,
    default: 'PENDING' // Initial status before attempting to send
  },
  vendorMessageId: {
      type: String // Optional ID returned by the dummy vendor API
  },
  sentAt: { // Timestamp when sending was attempted via vendor API
      type: Date
  },
  deliveredAt: { // Timestamp when vendor reported SUCCESS
      type: Date
  },
  failedAt: { // Timestamp when vendor reported FAILURE
      type: Date
  },
  failureReason: { // Optional reason from vendor on failure
      type: String
  }

}, {
  timestamps: true // Adds createdAt and updatedAt
  // You might set `updatedAt` to represent when the status last changed
});

// Create the Model
const CommunicationLog = mongoose.model('CommunicationLog', communicationLogSchema);

// Export the Model
module.exports = CommunicationLog;