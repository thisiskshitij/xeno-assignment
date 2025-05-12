// frontend/src/components/ConditionRow.jsx
import React from 'react';
import './ConditionRow.css';

// This component receives props:
// - condition: the data for this specific condition ({ id, field, operator, value })
// - onRemove: a callback function from parent to remove this condition by ID
// - onUpdate: a callback function from parent to update this condition by ID and field name
// - index: (Optional) index of the condition, useful for display or debugging

function ConditionRow({ condition, onRemove, onUpdate }) { // <-- Receiving props

    // Handlers for the select and input change events
    const handleFieldChange = (event) => {
        // Call the parent's onUpdate function
        onUpdate(condition.id, 'field', event.target.value);
    };

    const handleOperatorChange = (event) => {
        // Call the parent's onUpdate function
        onUpdate(condition.id, 'operator', event.target.value);
    };

    const handleValueChange = (event) => {
        // Call the parent's onUpdate function
        onUpdate(condition.id, 'value', event.target.value);
    };

    // Handler for the remove button click
    const handleRemoveClick = () => {
        // Call the parent's onRemove function
        onRemove(condition.id);
    };


    return (
        <div className="condition-row">
            {/* Field Selection */}
            <select
                value={condition.field} // Bind select value to the state prop
                onChange={handleFieldChange} // Call handler on change
            >
                <option value="">Select Field</option>
                <option value="totalSpend">Total Spend</option>
                <option value="totalVisits">Total Visits</option>
                <option value="lastActive">Last Active (Days Ago)</option>
                <option value="city">City</option>
                <option value="loyaltyTier">Loyalty Tier</option>
                 {/* Add other relevant fields */}
            </select>

            {/* Operator Selection */}
            <select
                value={condition.operator} // Bind select value to the state prop
                onChange={handleOperatorChange} // Call handler on change
            >
                 <option value="">Select Operator</option>
                 <option value="=">=</option>
                 <option value=">">&gt;</option>
                 <option value="<">&lt;</option>
                 <option value=">=">&ge;</option>
                 <option value="<=">&le;</option>
                 <option value="!=">!=</option>
                  {/* Add string operators like 'contains', 'starts with' if needed */}
            </select>

            {/* Value Input */}
            <input
                type="text" // Consider changing type based on field
                placeholder="Enter Value"
                value={condition.value} // Bind input value to the state prop
                onChange={handleValueChange} // Call handler on change
            />

            {/* Remove Button */}
            <button onClick={handleRemoveClick}>Remove</button> {/* Call handler on click */}
        </div>
    );
}

export default ConditionRow;