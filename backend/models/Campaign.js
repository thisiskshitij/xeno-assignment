const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a Campaign
const campaignSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Link to the Segment used for this campaign
  segmentId: {
    type: Schema.Types.ObjectId, // Reference to the Segment model
    ref: 'Segment', // The name of the Mongoose model this ObjectId refers to
    required: true
  },
  messageTemplate: {
    type: String, // The base message text (e.g., "Hi {{name}}, ...")
    required: true
  },
  status: {
    type: String, // e.g., 'CREATED', 'SENDING', 'COMPLETED', 'CANCELLED'
    required: true,
    default: 'CREATED'
  },
  // Store stats calculated after campaign initiation
  audienceSize: { // Number of customers when campaign was started
    type: Number,
    default: 0
  },
  sentCount: { // Number attempted to send
    type: Number,
    default: 0
  },
  failedCount: { // Number failed delivery
    type: Number,
    default: 0
  },
  // Link to the user who initiated the campaign (similar to segment)
  // initiatedBy: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User'
  // },

  completedAt: { // Timestamp when the campaign finished sending
      type: Date
  }

}, {
  timestamps: true // Adds createdAt and updatedAt (createdAt is the initiation time)
});

// Create the Model
const Campaign = mongoose.model('Campaign', campaignSchema);

// Export the Model
module.exports = Campaign;