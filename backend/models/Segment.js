const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Shorthand for mongoose.Schema

// Define the schema for a Segment
const segmentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true // Removes whitespace from beginning/end
  },
  // Structure to store the rule logic (flexible JSON)
  // Example: { operator: 'AND', conditions: [ { field: 'totalSpend', operator: '>', value: 10000 }, ... ] }
  rules: {
    type: Schema.Types.Mixed, // Use Mixed type for flexible/nested rule structures
    required: true
  },
  // You could add a count here, but it's dynamic, better to calculate preview on the fly.
  // previewAudienceSize: { type: Number, default: 0 },

  // Link to the user who created the segment (if you want to track this)
  // Requires User model to exist. For now, store ObjectId or just a user ID/email string.
  // Let's plan to use ObjectId references later when Authentication is fully implemented.
  // For now, maybe store user email as string or leave it out if not strictly needed yet.
  // createdBy: {
  //   type: Schema.Types.ObjectId, // Reference to the User model (requires user model setup)
  //   ref: 'User'
  // },

}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Create the Model
const Segment = mongoose.model('Segment', segmentSchema);

// Export the Model
module.exports = Segment;