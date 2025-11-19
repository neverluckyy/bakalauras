import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

// Configure axios to send cookies with all requests
axios.defaults.withCredentials = true;

// Configure axios base URL for development
if (process.env.NODE_ENV === 'development') {
  axios.defaults.baseURL = 'http://localhost:5000';
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
