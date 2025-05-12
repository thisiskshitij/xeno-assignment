// frontend/src/components/RuleBuilder.jsx
import React from 'react'; // No useState needed here anymore
import ConditionRow from './ConditionRow';
import './RuleBuilder.css';

// This component now receives state and handlers as props from CreateCampaignPage
function RuleBuilder({
    conditions, // Array of condition objects passed from parent
    overallOperator, // Overall operator string passed from parent
    onAddCondition, // Function from parent to add a condition
    onRemoveCondition, // Function from parent to remove a condition
    onUpdateCondition, // Function from parent to update a condition
    onOverallOperatorChange // Function from parent to update the overall operator
}) {

    return (
        <div className="rule-builder">
            <h2>Define Audience Segment</h2>

            <div className="overall-operator">
                <label htmlFor="overall-operator">Combine conditions using:</label>
                <select
                    id="overall-operator"
                    value={overallOperator} // <-- Bind select value to prop
                    onChange={onOverallOperatorChange} // <-- Call parent handler on change
                >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>
            </div>

            <div className="conditions-list">
                {/* Map over the 'conditions' prop and render a ConditionRow for each */}
                {conditions.map(condition => (
                    <ConditionRow
                        key={condition.id} // <-- Use a unique key
                        condition={condition} // Pass the condition data down
                        onRemove={onRemoveCondition} // Pass parent remove handler down
                        onUpdate={onUpdateCondition} // Pass parent update handler down
                    />
                ))}
                 {/* Show a message if no conditions */}
                 {conditions.length === 0 && (
                     <p className="no-conditions-message">Click "Add Condition" to define your segment rules.</p>
                 )}
            </div>

            {/* Call the parent's add handler */}
            <button onClick={onAddCondition}>Add Condition</button>

        </div>
    );
}

export default RuleBuilder;