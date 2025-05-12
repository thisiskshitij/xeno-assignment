const router = require('express').Router();
const Campaign = require('../models/Campaign'); // Need Campaign model
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Import middleware

// **Need to create the Campaign model in backend/models/Campaign.js**

router.use(ensureAuthenticated); // Protect all campaign routes

// GET /api/campaigns - Fetch all campaigns (for history page)
router.get('/', async (req, res) => {
  try {
    // Fetch all campaigns, maybe sort by creation date
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ message: err.message });
  }
});

// You might add GET /api/campaigns/:id for single campaign details later

module.exports = router;