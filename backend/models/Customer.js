const mongoose = require('mongoose');

// Define the schema for a customer
const customerSchema = new mongoose.Schema({
  // Mongoose automatically adds an _id field as the primary key

  // Fields from our schema design:
  customerId: { // Optional: if the ingested data has its own customer ID
    type: String,
    // You might add `unique: true` here if `customerId` from source is guaranteed unique
  },
  name: {
    type: String,
    required: true // Name is required
  },
  email: {
    type: String,
    // We'll add basic validation in the API route, but Mongoose can also validate format
    // unique: true // Uncomment if emails must be unique
  },
  phone: {
    type: String, // Store phone as string to handle various formats
  },
  address: {
    type: String,
  },
  totalSpend: {
    type: Number,
    default: 0 // Default spend to 0 for new customers
  },
  totalVisits: {
    type: Number,
    default: 0 // Default visits to 0
  },
  lastActive: {
    type: Date,
    default: Date.now // Default last active to the current date when created
  },
  ingestionSource: {
    type: String,
    default: 'api_ingestion' // To track where the data came from
  }
}, {
  timestamps: true // Mongoose adds createdAt and updatedAt timestamps automatically
});

// Create the Model from the schema
const Customer = mongoose.model('Customer', customerSchema);

// Export the Model
module.exports = Customer;