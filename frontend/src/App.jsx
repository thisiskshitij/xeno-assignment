import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import CreateCampaignPage from './pages/CreateCampaignPage';
import CampaignHistoryPage from './pages/CampaignHistoryPage';

import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Top Navbar */}
        <nav className="top-navbar">
          CRM App
        </nav>

        <div className="d-flex">
          {/* Sidebar */}
          <div className="sidebar collapsed">
            <ul className="nav collapsed">
              <li>
                <Link to="/create" className="nav-link">Create Campaign</Link>
              </li>
              <li>
                <Link to="/history" className="nav-link">Campaign History</Link>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="content">
            <Routes>
              <Route path="/create" element={<CreateCampaignPage />} />
              <Route path="/history" element={<CampaignHistoryPage />} />
              <Route path="*" element={<CreateCampaignPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
