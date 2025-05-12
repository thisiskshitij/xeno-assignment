// import React, { useState, useEffect } from 'react';

// const CampaignHistoryPage = () => {
//     const [campaigns, setCampaigns] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         const fetchCampaigns = async () => {
//             try {
//                 const response = await fetch('http://localhost:3000/api/campaigns', {
//                     method: 'GET',
//                     credentials: 'include'
//                 });

//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.message || 'Failed to fetch campaigns');
//                 }

//                 const data = await response.json();
//                 setCampaigns(data);
//                 setLoading(false);
//             } catch (err) {
//                 setError(err.message || 'An error occurred');
//                 setLoading(false);
//             }
//         };

//         fetchCampaigns();
//     }, []);

//     if (loading) {
//         return <p>Loading campaigns...</p>;
//     }

//     if (error) {
//         return <p>Error: {error}</p>;
//     }

//     if (campaigns.length === 0) {
//         return <p>No campaigns found.</p>;
//     }

//     return (
//         <div>
//             <h1>Campaign History</h1>
//             <ul>
//                 {campaigns.map((campaign) => (
//                     <li key={campaign._id}>
//                         <p>Name: {campaign.name}</p>
//                         <p>Status: {campaign.status}</p>
//                         <p>Audience Size: {campaign.audienceSize}</p>
//                         <p>Sent: {campaign.sentCount}</p>
//                         <p>Failed: {campaign.failedCount}</p>
//                         <p>Created At: {new Date(campaign.createdAt).toLocaleString()}</p>
//                          {campaign.completedAt && <p>Completed At: {new Date(campaign.completedAt).toLocaleString()}</p>}
//                     </li>
//                 ))}
//             </ul>
//             <button onClick={() => window.location.href = '/'}>
//                 Go to Create Campaign
//             </button>
//         </div>
//     );
// };

// export default CampaignHistoryPage;

import React, { useState, useEffect } from 'react';
import './CampaignHistoryPage.css';

const CampaignHistoryPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/campaigns', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch campaigns');
                }

                const data = await response.json();
                setCampaigns(data);
                setLoading(false);
            } catch (err) {
                setError(err.message || 'An error occurred');
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    if (loading) {
        return <p className="loading-message">Loading campaigns...</p>;
    }

    if (error) {
        return <p className="error-message">Error: {error}</p>;
    }

    if (campaigns.length === 0) {
        return <p className="no-campaigns-message">No campaigns found.</p>;
    }

    return (
        <div className="campaign-history-page">
            <h1 className="page-title">Campaign History</h1>
            <div className="campaign-list">
                {campaigns.map((campaign) => (
                    <div key={campaign._id} className="campaign-card">
                        <h2 className="campaign-name">{campaign.name}</h2>
                        <p><strong>Status:</strong> {campaign.status}</p>
                        <p><strong>Audience Size:</strong> {campaign.audienceSize}</p>
                        <p><strong>Sent:</strong> {campaign.sentCount}</p>
                        <p><strong>Failed:</strong> {campaign.failedCount}</p>
                        <p><strong>Created At:</strong> {new Date(campaign.createdAt).toLocaleString()}</p>
                        {campaign.completedAt && <p><strong>Completed At:</strong> {new Date(campaign.completedAt).toLocaleString()}</p>}
                    </div>
                ))}
            </div>
            <button className="create-campaign-button" onClick={() => window.location.href = '/'}>
                Go to Create Campaign
            </button>
        </div>
    );
};

export default CampaignHistoryPage;
