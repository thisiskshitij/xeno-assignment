// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose'); // Mongoose for MongoDB interaction
const bodyParser = require('body-parser'); // Generally good practice, though express.json() is used below
const cors = require('cors');


const passport = require('passport'); // <-- Import Passport
const session = require('express-session'); // <-- Import express-session

// Import your routes
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const segmentRoutes = require('./routes/segmentRoutes');
const dummyVendorRoutes = require('./routes/dummyVendorRoutes');
const deliveryReceiptRoutes = require('./routes/deliveryReceiptRoutes');
const authRoutes = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
// const authRoutes = require('./routes/authRoutes'); // Will be created later

// Import your Passport configuration setup file
require('./config/passportSetup'); // <-- Make sure you have this file and it's correct


const app = express();
const port = process.env.PORT || 3000; // Use port from environment variable or default to 3000

// MongoDB connection string from .env
const mongoURI = process.env.MONGODB_URI;

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    // Mongoose connect method
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected Successfully!');
  } catch (err) {
    console.error('MongoDB Connection Failed:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};


// --- Middleware ---

// CORS Middleware (if needed, configure appropriately for your frontend origin)
// CORS Middleware - Configure to allow your frontend's origin and credentials
app.use(cors({
    origin: 'http://localhost:5173', // <-- Replace with your frontend server URL/port
    credentials: true // <-- IMPORTANT: Allow cookies to be sent with requests
}));

// Middleware to parse JSON bodies in requests (using Express built-in)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Also useful for form data


// Session Middleware (REQUIRED for Passport sessions)
// Add SESSION_SECRET to your backend/.env file
app.use(session({
  secret: process.env.SESSION_SECRET, // Use a strong, random secret from your .env
  resave: false, // Avoids resaving session to the store if it wasn't modified
  saveUninitialized: false, // Avoids creating sessions for unauthenticated users
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // Session lasts for 1 day (example)
    // secure: true // Set to true in production with HTTPS
    // sameSite: 'lax' // Recommended setting for cross-site cookies
  }
}));

// Passport Middleware (Initialize and Session)
app.use(passport.initialize()); // Initializes Passport
app.use(passport.session());   // Enables Passport session support (requires session middleware above)

// --- End Middleware ---


// --- Routes ---

// Basic route to test the server (can be moved later)
app.get('/', (req, res) => {
  res.send('Xeno CRM Backend is running!');
});

// Mount your API routes
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/dummyVendor', dummyVendorRoutes);
app.use('/api/delivery-receipts', deliveryReceiptRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/auth', authRoutes); // Mount auth routes under the /auth path

// Mount authentication routes (We'll add these next)
// app.use('/auth', authRoutes);


// --- End Routes ---


// Start the server AFTER connecting to the database
// We call connectDB().then(...) to ensure the server only starts if the DB connection is successful
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

