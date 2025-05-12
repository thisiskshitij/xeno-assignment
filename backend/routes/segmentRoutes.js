const express = require('express');
const router = express.Router();
const Segment = require('../models/Segment');
const Customer = require('../models/Customer'); // We need the Customer model to query
const Campaign = require('../models/Campaign');   // Need Campaign to create new campaign
const CommunicationLog = require('../models/CommunicationLog'); // Need Log to create entries
const processCampaign = require('../controllers/campaignController'); // Assuming your file is campaignController.js
// --- Helper function to translate segment rules into MongoDB query ---
// This function will take the rules object (like { operator: 'AND', conditions: [...] })
// and convert it into a MongoDB query object (like { $and: [...] }).

const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Import middleware
router.use(ensureAuthenticated); // Protect all segment routes


const buildMongoQueryFromRules = (rules) => {
    if (!rules || !rules.conditions || !Array.isArray(rules.conditions)) {
        // Handle invalid or empty rules structure
        return {}; // Return an empty query which matches all documents
    }

    // Function to handle a single condition (e.g., { field: 'totalSpend', operator: '>', value: 5000 })
    const processCondition = (condition) => {
        const { field, operator, value } = condition;
        if (!field || !operator || value === undefined) {
            console.warn('Invalid condition:', condition);
            return null; // Skip invalid conditions
        }

        // Map your custom operators to MongoDB query operators
        let mongoOperator;
        switch (operator) {
            case '>': mongoOperator = '$gt'; break;
            case '<': mongoOperator = '$lt'; break;
            case '=': mongoOperator = '$eq'; break;
            case '!=': mongoOperator = '$ne'; break;
            case '>=': mongoOperator = '$gte'; break;
            case '<=': mongoOperator = '$lte'; break;
            // Add more operators as needed (e.g., for strings like 'contains', 'starts with')
            // case 'contains': mongoOperator = '$regex'; value = new RegExp(value, 'i'); break; // Example case-insensitive contains
            default:
                console.warn('Unknown operator:', operator);
                return null; // Skip unknown operators
        }

        // --- Type Handling ---
        // MongoDB queries need values of the correct type.
        // Our Customer schema uses Number and Date.
        let processedValue = value;
        // If the field is expected to be a Number, try converting the value
        if (['totalSpend', 'totalVisits'].includes(field) && typeof value !== 'number') {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) {
                console.warn(`Value for numeric field "${field}" is not a number:`, value);
                return null; // Skip if conversion fails
            }
        }
        // If the field is expected to be a Date, try converting the value
        if (['lastActive', 'createdAt', 'updatedAt'].includes(field) && !(value instanceof Date)) {
            processedValue = new Date(value);
            if (isNaN(processedValue.getTime())) {
                console.warn(`Value for date field "${field}" is not a valid date:`, value);
                return null; // Skip if conversion fails
            }
        }
        // Add checks for other types like Boolean, String regex etc if needed

        return { [field]: { [mongoOperator]: processedValue } };
    };

    // Function to handle nested rule groups (AND/OR)
    const processRuleGroup = (ruleGroup) => {
        if (!ruleGroup || !ruleGroup.conditions || !Array.isArray(ruleGroup.conditions)) {
            console.warn('Invalid rule group structure:', ruleGroup);
            return null;
        }

        const conditions = ruleGroup.conditions
            .map(item => {
                // If the item has 'operator' and 'conditions', it's a nested group
                if (item.operator && Array.isArray(item.conditions)) {
                    return processRuleGroup(item); // Recursively process nested group
                } else {
                    // Otherwise, it's a single condition
                    return processCondition(item);
                }
            })
            .filter(item => item !== null); // Filter out any invalid conditions/groups

        if (conditions.length === 0) {
            return null; // If group is empty after processing, skip it
        }

        // Apply the logical operator ($and, $or)
        const mongoOperator = ruleGroup.operator === 'OR' ? '$or' : '$and'; // Default to $and

        return { [mongoOperator]: conditions };
    };

    // Process the top-level rule group
    const mongoQuery = processRuleGroup(rules);

    // If the top-level processing results in null or an empty query (after filtering),
    // we should maybe return a query that matches nothing or everything depending on desired default.
    // An empty object {} matches all documents. If rules are invalid, maybe match nothing?
    // For preview, matching everything for invalid rules might be confusing. Let's stick to {} for now.
    if (!mongoQuery || Object.keys(mongoQuery).length === 0) {
        return {}; // Fallback to match all if rules logic doesn't yield a valid query
    }


    return mongoQuery;
};
// --- End of Helper function ---


// POST /api/segments/preview - Endpoint to get audience size preview
// GET /api/segments/preview - Endpoint to get audience size preview
router.get('/preview', async (req, res) => { // <-- **CHANGE THIS FROM POST TO GET**
    try {
        // Get rules from the request query parameters for GET requests
        const rules = req.query.rules ? JSON.parse(req.query.rules) : null; // <-- **CHANGE THIS TO READ FROM req.query**

        // Basic validation: Check if rules are present and parsed successfully
        if (!rules) {
             console.warn('Backend: Preview request missing or invalid rules in query.');
            return res.status(400).json({ message: 'Segment rules are required and must be valid JSON in the "rules" query parameter' });
        }

        // Translate the JSON rules structure into a MongoDB query object
        const mongoQuery = buildMongoQueryFromRules(rules);
        console.log("Backend: Translated MongoDB Query:", JSON.stringify(mongoQuery));

        // Use Mongoose's countDocuments method with the generated query
        const audienceSize = await Customer.countDocuments(mongoQuery);
        console.log("Backend: Audience size calculated:", audienceSize);

        // Respond with the count
        res.status(200).json({ audienceSize: audienceSize });
        console.log("Backend: Sent 200 JSON response for preview.");

    } catch (err) {
        console.error('Backend: Error in GET /api/segments/preview handler:', err);
res.status(500).json({ message: 'Failed to get audience preview', error: err.message });
        console.log("Backend: Sent 500 JSON response for preview error.");
    }
});

// POST /api/segments - Endpoint to create and save a new segment AND initiate campaign
router.post('/', async (req, res) => {
    try {
        const { name, rules, messageTemplate } = req.body; // Now also expect messageTemplate

        if (!name || !rules || !messageTemplate) { // messageTemplate is now required too
            return res.status(400).json({ message: 'Segment name, rules, and messageTemplate are required' });
        }

        // 1. Save the segment
        const newSegment = new Segment({ name, rules });
        const savedSegment = await newSegment.save();
        console.log(`Segment "${savedSegment.name}" saved.`);

        // --- Campaign Initiation Logic ---

        // 2. Find the customers matching the segment rules
        const mongoQuery = buildMongoQueryFromRules(savedSegment.rules); // Use the saved segment's rules
        const audienceCustomers = await Customer.find(mongoQuery).select('_id name'); // Find customers, only get _id and name
        const audienceSize = audienceCustomers.length;
        console.log(`Found ${audienceSize} customers for campaign.`);

        if (audienceSize === 0) {
            console.log("No customers found for this segment. Campaign not initiated.");
            // You might still want to create the campaign record with audienceSize 0
            const newCampaign = new Campaign({
                name: `Campaign for ${savedSegment.name}`,
                segmentId: savedSegment._id,
                messageTemplate: messageTemplate,
                status: 'COMPLETED_NO_AUDIENCE', // Or a suitable status
                audienceSize: 0,
                sentCount: 0,
                failedCount: 0
                // initiatedBy will be added later with authentication
            });
            await newCampaign.save();
            console.log(`Campaign record created with 0 audience.`);
            // Respond with the saved segment and maybe info about campaign status
            return res.status(201).json({
                segment: savedSegment,
                campaignStatus: 'CREATED_NO_AUDIENCE',
                message: 'Segment saved. No audience found for campaign.'
            });
        }


        // 3. Create the new Campaign document
        const newCampaign = new Campaign({
            name: `Campaign for ${savedSegment.name}`, // Auto-generate campaign name
            segmentId: savedSegment._id, // Link to the saved segment
            messageTemplate: messageTemplate, // Use the provided message template
            status: 'INITIATED', // Or 'SENDING'
            audienceSize: audienceSize, // Store the size at initiation time
            // sentCount, failedCount will default to 0
            // initiatedBy will be added later with authentication
        });
        const savedCampaign = await newCampaign.save();
        console.log(`Campaign "${savedCampaign.name}" initiated (ID: ${savedCampaign._id}).`);

        // 4. Create initial Communication Log entries for each customer
        const logEntries = audienceCustomers.map(customer => ({
            campaignId: savedCampaign._id, // Link to the new campaign
            customerId: customer._id,     // Link to the customer
            messageContent: "Placeholder message"
            // messageContent will be generated during the actual sending phase
            // status defaults to 'PENDING'
            // timestamps handle createdAt
        }));

        // Use insertMany for efficiency to save multiple log entries at once
        const savedLogs = await CommunicationLog.insertMany(logEntries);
        console.log(`Created ${savedLogs.length} communication log entries.`);

        // --- Trigger Actual Sending (Placeholder) ---
        // The logic to loop through savedLogs and call the dummy vendor API goes here.
        // This might be calling a separate function or service.
        // console.log("Placeholder: Logic to trigger actual message sending starts here.");
        // TODO: Implement logic to process savedLogs and send messages via vendor API
// --- Trigger Actual Sending ---
    // Call the processCampaign function to handle sending messages asynchronously
    // Note: Calling directly here makes the API request wait. For production,
    // you might enqueue this job using a message queue (the pub-sub bonus!).
    processCampaign(savedCampaign._id)
        .then(() => console.log(`Triggered processCampaign for ID: ${savedCampaign._id}`))
        .catch(err => console.error(`Failed to trigger processCampaign for ID ${savedCampaign._id}:`, err));

    // ... (rest of the response code) ...

        // Respond with the saved segment and details about the initiated campaign
        res.status(201).json({
            segment: savedSegment,
            campaign: { // Return relevant campaign info
                _id: savedCampaign._id,
                name: savedCampaign.name,
                audienceSize: savedCampaign.audienceSize,
                status: savedCampaign.status,
                createdAt: savedCampaign.createdAt
            },
            message: 'Segment saved and campaign initiated.'
        });

    } catch (err) {
        console.error('Error saving segment or initiating campaign:', err);
        res.status(500).json({ message: 'Failed to save segment or initiate campaign', error: err.message });
    }
});

// Export the router
module.exports = router;
