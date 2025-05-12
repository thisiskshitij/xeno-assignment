const mongoose = require('mongoose');

// Define the schema for an order
const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    // unique: true // Uncomment if orderId from source is guaranteed unique
  },
  customerId: {
    type: String, // Store the customerId string
    required: true, // An order must belong to a customer
  },
  amount: {
    type: Number,
    required: true, // Order must have an amount
  },
  orderDate: {
    type: Date,
    required: true, // Order must have a date
    default: Date.now
  },
  items: [{ // Array of items (example structure)
    productId: { type: String },
    quantity: { type: Number },
    price: { type: Number }
  }],
  ingestionSource: {
    type: String,
    default: 'api_ingestion'
  }
}, {
  timestamps: true // Mongoose adds createdAt and updatedAt
});

// Create the Model from the schema
// Mongoose will automatically look for a collection named 'orders'
const Order = mongoose.model('Order', orderSchema);

// Export the Model so it can be used in other files
module.exports = Order; // <-- **Check this line carefully**