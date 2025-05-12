const express = require('express');
const router = express.Router(); // Create a new router object
const Customer = require('../models/Customer'); // Import the Customer model
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Import middleware

// Apply middleware to all routes in this router (or specific ones)
router.use(ensureAuthenticated); // Protect all customer routes

// POST /api/customers - Endpoint to ingest new customer data
router.post('/', async (req, res) => {
  try {
    // Basic validation: Check if required fields are present in the request body
    const { name, email, customerId, phone, address } = req.body;

    if (!name || !email) {
      // Return a 400 Bad Request if required fields are missing
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // --- Add more robust validation here if needed (e.g., email format, phone format) ---
    // Example basic email format check (using a simple regex, more robust validation might use libraries)
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //   return res.status(400).json({ message: 'Invalid email format' });
    // }
    // ----------------------------------------------------------------------------------

    // Create a new customer instance using the Mongoose Model
    const newCustomer = new Customer({
      customerId, // Takes customerId from body if present
      name,       // Takes name from body
      email,      // Takes email from body
      phone,      // Takes phone from body if present
      address,    // Takes address from body if present
      // totalSpend, totalVisits, lastActive, ingestionSource, timestamps are handled by schema defaults or Mongoose
    });

    // Save the new customer document to MongoDB
    const savedCustomer = await newCustomer.save();

    // Respond with the saved customer data and 201 Created status
    res.status(201).json(savedCustomer);

  } catch (err) {
    // If an error occurs during save (e.g., validation error caught by Mongoose, or DB issue)
    console.error('Error saving customer:', err);
    // Respond with a 500 Internal Server Error
    res.status(500).json({ message: 'Failed to ingest customer data', error: err.message });
  }
});
router.get('/', async (req, res) => {
  console.log('*** INSIDE GET /api/customers ROUTE HANDLER ***'); // Added diagnostic log again
  try {
    const customers = await Customer.find(); // Fetch all customers from MongoDB
    res.json(customers); // Respond with the customer data
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Failed to fetch customer data', error: err.message });
  }
});
// Export the router
module.exports = router;