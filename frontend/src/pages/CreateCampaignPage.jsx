// // frontend/src/pages/CreateCampaignPage.jsx
// import React, { useState, useEffect } from 'react';
// import RuleBuilder from '../components/RuleBuilder'; // Import RuleBuilder component
// import './CreateCampaignPage.css';

// function CreateCampaignPage() {
//     const [campaignName, setCampaignName] = useState('');
//     const [messageTemplate, setMessageTemplate] = useState('');

//     // --- State for the Rule Builder (Managed here) ---
//     const [conditions, setConditions] = useState([]); // Array of condition objects { id, field, operator, value }
//     const [overallOperator, setOverallOperator] = useState('AND'); // Default overall operator
//     const [audienceSize, setAudienceSize] = useState(null); // State to display audience size
//     const [loadingPreview, setLoadingPreview] = useState(false); // Loading state for preview
//     const [loadingSave, setLoadingSave] = useState(false); // Loading state for save

//     // --- Authentication Check ---
//     useEffect(() => {
//         const checkAuth = async () => {
//             try {
//                 const response = await fetch('http://localhost:3000/auth/check', {
//                     method: 'GET',
//                     headers: { 'Content-Type': 'application/json' },
//                     credentials: 'include'
//                 });

//                 const result = await response.json();

//                 if (!result.isAuthenticated) {
//                     console.warn('User not authenticated, redirecting to login.');
//                     window.location.href = 'http://localhost:3000/auth/google';
//                      return;
//                 }
//                  console.log('User is authenticated:', result.user.name);
//                  // Optionally store user info in state if needed elsewhere on the page
//             } catch (error) {
//                 console.error('Error during authentication check:', error);
//                  window.location.href = 'http://localhost:3000/auth/google';
//             }
//         };

//         checkAuth();

//     }, []); // Empty dependency array means this runs once on component mount


//     // --- Handlers for Campaign Details input changes ---
//     const handleNameChange = (event) => {
//         setCampaignName(event.target.value);
//     };

//     const handleMessageChange = (event) => {
//         setMessageTemplate(event.target.value);
//     };

//     // --- Handlers for Rule Builder (Passed down to RuleBuilder.jsx) ---

//     const handleAddCondition = () => {
//          setConditions([...conditions, { id: Date.now(), field: '', operator: '', value: '' }]);
//          setAudienceSize(null); // Clear preview when rules change
//     };

//     const handleRemoveCondition = (id) => {
//         const updatedConditions = conditions.filter(condition => condition.id !== id);
//         setConditions(updatedConditions);
//          setAudienceSize(null); // Clear preview when rules change
//     };

//     const handleUpdateCondition = (id, fieldName, newValue) => {
//         const updatedConditions = conditions.map(condition => {
//             if (condition.id === id) {
//                 return { ...condition, [fieldName]: newValue };
//             }
//             return condition;
//         });
//         setConditions(updatedConditions);
//          setAudienceSize(null); // Clear preview when rules change
//     };

//     const handleOverallOperatorChange = (event) => {
//         setOverallOperator(event.target.value);
//          setAudienceSize(null); // Clear preview when rules change
//     };

//     // --- Function to Build Rules JSON from state ---
//     const buildRulesJson = () => {
//          // Only include conditions that have a field and operator selected
//          const validConditions = conditions.filter(c => c.field && c.operator);

//          if (validConditions.length === 0) {
//              return null; // Indicate no valid rules defined
//          }

//         return {
//             operator: overallOperator,
//             conditions: validConditions.map(c => ({
//                 field: c.field,
//                 operator: c.operator,
//                 value: c.value // Pass value as is, backend buildMongoQuery handles type coercion
//             }))
//         };
//     };


//     // --- Handler for Preview Audience ---
//     const handlePreviewAudience = async () => {
//         const rules = buildRulesJson();

//         if (!rules) {
//              setAudienceSize('Please add valid conditions.');
//              return;
//         }

//         setLoadingPreview(true); // Set loading state
//         setAudienceSize(null); // Clear previous result

//         try {
//              // Call the backend preview endpoint (requires authentication)
//              // Rules are sent as a stringified JSON query parameter
//              const response = await fetch('http://localhost:3000/api/segments/preview?' +
//                  new URLSearchParams({ rules: JSON.stringify(rules) }).toString(),
//                  {
//                      method: 'GET',
//                      headers: { 'Content-Type': 'application/json' },
//                      credentials: 'include' // Send session cookie
//                  }
//              );

//             console.log('Preview response status:', response.status);

//              if (response.status === 401) {
//                  console.warn('Authentication failed during preview.');
//                  // Redirect to login - useEffect should handle this on page load,
//                  // but good practice to consider here too if session expires while on page.
//                  window.location.href = 'http://localhost:3000/auth/google';
//                  return; // Stop processing
//              }

//              if (!response.ok) {
//                  const error = await response.json();
//                  console.error('Error previewing audience:', response.status, error);
//                  setAudienceSize(`Error: ${error.message || response.statusText}`);
//                  return; // Stop processing
//              }

//              const result = await response.json();
//              setAudienceSize(`Estimated Audience Size: ${result.audienceSize}`);

//         } catch (error) {
//              console.error('Fetch error during preview:', error);
//              setAudienceSize(`An error occurred: ${error.message}`);
//         } finally {
//             setLoadingPreview(false); // Clear loading state
//         }
//     };


//     // --- Handler for Save Campaign (Implement later) ---
//     const handleSaveCampaign = async () => {
//         console.log('Save Campaign clicked!');
//         // TODO: Implement save logic

//         // 1. Get data from state and build the request body
//         const name = campaignName.trim();
//         const messageTemplateContent = messageTemplate.trim(); // Use a different variable name to avoid conflict
//         const rules = buildRulesJson(); // Get the rules JSON structure

//         // Basic Frontend Validation
//         if (!name || !messageTemplateContent) {
//             alert('Please enter a Campaign Name and Message Template.');
//             return;
//         }
//          if (!rules) {
//              alert('Please define at least one valid segment condition.');
//              return;
//          }

//         const campaignData = {
//             name: name,
//             messageTemplate: messageTemplateContent,
//             rules: rules // The rules object from buildRulesJson
//         };

//         console.log('Attempting to save campaign with data:', campaignData);

//         setLoadingSave(true); // Set loading state for the save button

//         try {
//             // 2. Call backend /api/segments (POST) endpoint
//             const response = await fetch('http://localhost:3000/api/segments', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     // 'Authorization': `Bearer ${yourToken}` // Not needed for session-based auth with credentials:'include'
//                 },
//                 body: JSON.stringify(campaignData), // Send the data as a JSON string in the body
//                 credentials: 'include' // IMPORTANT: Send session cookie
//             });

//             console.log('Save response status:', response.status);

//             // 3. Handle the response
//             if (response.status === 401) {
//                 console.warn('Authentication failed during save.');
//                 alert('Login required to save campaign.');
//                  // Redirect to login - useEffect should handle this on page load
//                  window.location.href = 'http://localhost:3000/auth/google';
//                 return; // Stop processing
//             }

//             if (!response.ok) {
//                 // Handle non-OK responses (e.g., 400 Bad Request, 500 Internal Server Error)
//                  const error = await response.json(); // Attempt to parse error JSON
//                  console.error('Error saving campaign:', response.status, error);
//                  alert(`Error saving campaign: ${error.message || response.statusText}`);
//                 return; // Stop processing
//             }

//             // If response is OK (status 200, 201, etc.)
//             const result = await response.json(); // Parse the success JSON response
//             console.log('Campaign saved successfully:', result);

//             // 4. Show success message and redirect
//             alert('Campaign saved and initiated successfully!');

//             // TODO: Redirect to the Campaign History page
//             // For now, redirect to the root, assuming History is there or you'll set up routing:
//              window.location.href = '/'; // Redirect to the root of your frontend app
//             // If you set up React Router, you'd use navigate('/history'); instead

//         } catch (error) {
//             console.error('Fetch error during save:', error);
//             alert(`An error occurred while saving the campaign: ${error.message}`);
//         } finally {
//             setLoadingSave(false); // Clear loading state regardless of success or failure
//         }
    
//     };

//     // --- Render Loading/Authentication State (Optional but good UX) ---
//     // If you wanted to show a loading spinner while checkAuth is running,
//     // you'd use another state variable like `isLoadingAuth`.
//     // For now, the redirect handles the unauthenticated case.

//     return (
//         <div className="create-campaign-page">
//             <h1>Create New Campaign</h1>

//             <div className="form-section">
//                 <h2>Campaign Details</h2>
//                 <div className="form-group">
//                     <label htmlFor="campaign-name">Campaign Name:</label>
//                     <input
//                         type="text"
//                         id="campaign-name"
//                         value={campaignName}
//                         onChange={handleNameChange}
//                         required
//                     />
//                 </div>

//                 <div className="form-group">
//                     <label htmlFor="message-template">Message Template:</label>
//                     <textarea
//                         id="message-template"
//                         rows="6"
//                         value={messageTemplate}
//                         onChange={handleMessageChange}
//                         required
//                         placeholder="e.g., Hi {{name}}, ..."
//                     ></textarea>
//                 </div>
//             </div>

//             {/* Rule Builder Section - Pass state and handlers down */}
//             <div className="form-section">
//                 <RuleBuilder
//                     conditions={conditions} // Pass conditions state down
//                     overallOperator={overallOperator} // Pass overallOperator state down
//                     onAddCondition={handleAddCondition} // Pass add handler down
//                     onRemoveCondition={handleRemoveCondition} // Pass remove handler down
//                     onUpdateCondition={handleUpdateCondition} // Pass update handler down
//                     onOverallOperatorChange={handleOverallOperatorChange} // Pass overall operator handler down
//                 />
//             </div>

//             <div className="form-section">
//                 <div className="form-group">
//                     <button onClick={handlePreviewAudience} disabled={loadingPreview}>
//                        {loadingPreview ? 'Calculating...' : 'Preview Audience Size'}
//                     </button>
//                     {/* Display audience size result */}
//                     <span id="audience-size" style={{ marginLeft: '10px' }}>
//                        {/* Only render if audienceSize is not null */}
//                        {audienceSize !== null && audienceSize}
//                     </span>
//                 </div>

//                 <button onClick={handleSaveCampaign} disabled={loadingSave}>
//                    {loadingSave ? 'Saving...' : 'Save Segment & Initiate Campaign'}
//                 </button>
//             </div>
//         </div>
//     );
// }

// export default CreateCampaignPage;

import React, { useState, useEffect } from 'react';
import RuleBuilder from '../components/RuleBuilder'; // Import RuleBuilder component
import './CreateCampaignPage.css';

function CreateCampaignPage() {
    const [campaignName, setCampaignName] = useState('');
    const [messageTemplate, setMessageTemplate] = useState('');
    const [conditions, setConditions] = useState([]);
    const [overallOperator, setOverallOperator] = useState('AND');
    const [audienceSize, setAudienceSize] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('http://localhost:3000/auth/check', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });

                const result = await response.json();

                if (!result.isAuthenticated) {
                    window.location.href = 'http://localhost:3000/auth/google';
                }
            } catch (error) {
                console.error('Error during authentication check:', error);
                window.location.href = 'http://localhost:3000/auth/google';
            }
        };

        checkAuth();
    }, []);

    const handleNameChange = (event) => setCampaignName(event.target.value);
    const handleMessageChange = (event) => setMessageTemplate(event.target.value);

    const handleAddCondition = () => {
        setConditions([...conditions, { id: Date.now(), field: '', operator: '', value: '' }]);
        setAudienceSize(null);
    };

    const handleRemoveCondition = (id) => {
        setConditions(conditions.filter(condition => condition.id !== id));
        setAudienceSize(null);
    };

    const handleUpdateCondition = (id, fieldName, newValue) => {
        const updatedConditions = conditions.map(condition =>
            condition.id === id ? { ...condition, [fieldName]: newValue } : condition
        );
        setConditions(updatedConditions);
        setAudienceSize(null);
    };

    const handleOverallOperatorChange = (event) => {
        setOverallOperator(event.target.value);
        setAudienceSize(null);
    };

    const buildRulesJson = () => {
        const validConditions = conditions.filter(c => c.field && c.operator);
        if (validConditions.length === 0) return null;
        return {
            operator: overallOperator,
            conditions: validConditions.map(c => ({
                field: c.field,
                operator: c.operator,
                value: c.value
            }))
        };
    };

    const handlePreviewAudience = async () => {
        const rules = buildRulesJson();
        if (!rules) {
            setAudienceSize('Please add valid conditions.');
            return;
        }

        setLoadingPreview(true);
        setAudienceSize(null);

        try {
            const response = await fetch('http://localhost:3000/api/segments/preview?' +
                new URLSearchParams({ rules: JSON.stringify(rules) }).toString(),
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                }
            );

            if (response.status === 401) {
                window.location.href = 'http://localhost:3000/auth/google';
                return;
            }

            if (!response.ok) {
                const error = await response.json();
                setAudienceSize(`Error: ${error.message || response.statusText}`);
                return;
            }

            const result = await response.json();
            setAudienceSize(`Estimated Audience Size: ${result.audienceSize}`);

        } catch (error) {
            setAudienceSize(`An error occurred: ${error.message}`);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleSaveCampaign = async () => {
        const name = campaignName.trim();
        const messageTemplateContent = messageTemplate.trim();
        const rules = buildRulesJson();

        if (!name || !messageTemplateContent) {
            alert('Please enter a Campaign Name and Message Template.');
            return;
        }
        if (!rules) {
            alert('Please define at least one valid segment condition.');
            return;
        }

        const campaignData = {
            name: name,
            messageTemplate: messageTemplateContent,
            rules: rules
        };

        setLoadingSave(true);

        try {
            const response = await fetch('http://localhost:3000/api/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignData),
                credentials: 'include'
            });

            if (response.status === 401) {
                window.location.href = 'http://localhost:3000/auth/google';
                return;
            }

            if (!response.ok) {
                const error = await response.json();
                alert(`Error saving campaign: ${error.message || response.statusText}`);
                return;
            }

            alert('Campaign saved and initiated successfully!');
            window.location.href = '/';

        } catch (error) {
            alert(`An error occurred while saving the campaign: ${error.message}`);
        } finally {
            setLoadingSave(false);
        }
    };

    return (
        <div className="create-campaign-page">
            <h1 className="page-title">Create New Campaign</h1>

            <div className="form-section">
                <h2 className="section-title">Campaign Details</h2>
                <div className="form-group">
                    <label htmlFor="campaign-name">Campaign Name:</label>
                    <input
                        type="text"
                        id="campaign-name"
                        value={campaignName}
                        onChange={handleNameChange}
                        required
                        className="input-field"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="message-template">Message Template:</label>
                    <textarea
                        id="message-template"
                        rows="6"
                        value={messageTemplate}
                        onChange={handleMessageChange}
                        required
                        placeholder="e.g., Hi {{name}}, ..."
                        className="textarea-field"
                    ></textarea>
                </div>
            </div>

            <div className="form-section">
                <RuleBuilder
                    conditions={conditions}
                    overallOperator={overallOperator}
                    onAddCondition={handleAddCondition}
                    onRemoveCondition={handleRemoveCondition}
                    onUpdateCondition={handleUpdateCondition}
                    onOverallOperatorChange={handleOverallOperatorChange}
                />
            </div>

            <div className="form-section">
                <div className="form-group">
                    <button
                        onClick={handlePreviewAudience}
                        disabled={loadingPreview}
                        className="action-button preview-button"
                    >
                        {loadingPreview ? 'Calculating...' : 'Preview Audience Size'}
                    </button>
                    <span className="audience-size">
                        {audienceSize !== null && audienceSize}
                    </span>
                </div>

                <button
                    onClick={handleSaveCampaign}
                    disabled={loadingSave}
                    className="action-button save-button"
                >
                    {loadingSave ? 'Saving...' : 'Save Segment & Initiate Campaign'}
                </button>
            </div>
        </div>
    );
}

export default CreateCampaignPage;
