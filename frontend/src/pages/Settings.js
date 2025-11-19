import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Palette, Save, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    email: user?.email || '',
    avatar_key: user?.avatar_key || 'robot_coral'
  });

  // Available avatars
  const availableAvatars = [
    { key: 'robot_coral', name: 'Coral Robot' },
    { key: 'robot_gold', name: 'Gold Robot' },
    { key: 'robot_lavender', name: 'Lavender Robot' },
    { key: 'robot_mint', name: 'Mint Robot' },
    { key: 'robot_sky', name: 'Sky Robot' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarSelect = (avatarKey) => {
    setFormData(prev => ({
      ...prev,
      avatar_key: avatarKey
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.put('/api/user/profile', formData, {
        withCredentials: true
      });
      
      // Update the user context with new data
      updateUser(response.data.user);
      setMessage('Profile updated successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/profile');
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button onClick={handleBack} className="back-button">
          <ArrowLeft size={20} />
          Back to Profile
        </button>
        <h1>Settings</h1>
      </div>

      {message && (
        <div className="message success">
          {message}
        </div>
      )}

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      <div className="settings-content">
        <form onSubmit={handleSubmit} className="settings-form">
          {/* Profile Information Section */}
          <div className="settings-section">
            <div className="section-header">
              <User size={20} />
              <h2>Profile Information</h2>
            </div>
            
            <div className="form-group">
              <label htmlFor="display_name">Display Name</label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder="Enter your display name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Avatar Selection Section */}
          <div className="settings-section">
            <div className="section-header">
              <Palette size={20} />
              <h2>Avatar Selection</h2>
            </div>
            
            <div className="avatar-grid">
              {availableAvatars.map((avatar) => (
                <div
                  key={avatar.key}
                  className={`avatar-option ${formData.avatar_key === avatar.key ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(avatar.key)}
                >
                  <img
                    src={`/avatars/${avatar.key}.svg`}
                    alt={avatar.name}
                    className="avatar-preview"
                  />
                  <span className="avatar-name">{avatar.name}</span>
                  {formData.avatar_key === avatar.key && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account Security Section */}
          <div className="settings-section">
            <div className="section-header">
              <Shield size={20} />
              <h2>Account Security</h2>
            </div>
            
            <div className="security-info">
              <p>Your account is secured with email and password authentication.</p>
              <p>For additional security features, please contact support.</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
