const express = require('express');
const router = express.Router(); // Create a new router object
const Order = require('../models/Order');     // Import the Order model
const Customer = require('../models/Customer'); // Import the Customer model (needed to update customer stats)
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Import middleware

router.use(ensureAuthenticated); // Protect all order routes
// POST /api/orders - Endpoint to ingest new order data
router.post('/', async (req, res) => {
  try {
    // Basic validation: Check if required fields are present
    const { customerId, orderId, orderDate, amount, items } = req.body;

    if (!customerId || amount === undefined || amount === null) { // Check for customerId and amount
      return res.status(400).json({ message: 'customerId and amount are required' });
    }

    // Optional: Validate orderDate format if needed
    let parsedOrderDate = orderDate ? new Date(orderDate) : new Date(); // Use provided date or current

    if (isNaN(parsedOrderDate.getTime())) {
         return res.status(400).json({ message: 'Invalid orderDate format' });
    }


    // Create a new order instance using the Mongoose Model
    const newOrder = new Order({
      orderId,       // Takes orderId from body if present
      customerId,    // Takes customerId from body
      orderDate: parsedOrderDate, // Use the parsed date
      amount,        // Takes amount from body
      items,         // Takes items array from body if present
      // ingestionSource, timestamps are handled by schema defaults or Mongoose
    });

    // Save the new order document to MongoDB
    const savedOrder = await newOrder.save();

    // --- Now, find the associated customer and update their stats ---

    // Find the customer by the customerId provided in the order data
    const customer = await Customer.findOne({ customerId: customerId });

    if (customer) {
      // Update customer's total spend, total visits, and last active date
      customer.totalSpend = (customer.totalSpend || 0) + amount; // Add current order amount to total spend
      // Assuming each order corresponds to one visit for simplicity. Adjust logic if needed.
      customer.totalVisits = (customer.totalVisits || 0) + 1;
      customer.lastActive = parsedOrderDate; // Update last active date to this order's date

      // Save the updated customer document
      await customer.save();
      console.log(`Updated customer ${customerId} stats.`);

    } else {
      // Log a warning if the customer wasn't found (data inconsistency)
      console.warn(`Order received for unknown customerId: ${customerId}`);
      // Depending on requirements, you might reject the order or create a new customer record here.
      // For now, we'll save the order but log the warning.
    }

    // Respond with the saved order data and 201 Created status
    res.status(201).json(savedOrder);

  } catch (err) {
    // If an error occurs during save or update
    console.error('Error processing order:', err);
    res.status(500).json({ message: 'Failed to ingest order data', error: err.message });
  }
});

// Export the router
module.exports = router;