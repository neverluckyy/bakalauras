import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Star, Target, Calendar, Award, Settings, LogOut } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const [statsRes, achievementsRes] = await Promise.all([
        axios.get('/api/user/stats'),
        axios.get('/api/user/achievements')
      ]);
      
      setStats(statsRes.data || {});
      setAchievements(Array.isArray(achievementsRes.data) ? achievementsRes.data : []);
    } catch (err) {
      setError('Failed to load user statistics');
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  // Refresh stats when the user navigates to this page
  useEffect(() => {
    const handleFocus = () => {
      fetchUserStats();
    };

    // Refresh stats when the page becomes visible
    document.addEventListener('visibilitychange', handleFocus);
    
    // Also refresh when the location changes (user navigates to this page)
    if (location.pathname === '/profile') {
      fetchUserStats();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [location.pathname]);

  const calculateLevel = (xp) => {
    return Math.floor(xp / 100) + 1;
  };

  const getLevelProgress = (xp) => {
    const currentLevel = calculateLevel(xp);
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const xpForNextLevel = currentLevel * 100;
    const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
    return Math.min(progress, 100);
  };

  const getLevelTitle = (level) => {
    if (level >= 20) return 'Security Master';
    if (level >= 15) return 'Security Expert';
    if (level >= 10) return 'Security Specialist';
    if (level >= 5) return 'Security Enthusiast';
    return 'Security Beginner';
  };

  const handleLogout = () => {
    logout();
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const userLevel = calculateLevel(user.total_xp || 0);
  const levelProgress = getLevelProgress(user.total_xp || 0);
  const levelTitle = getLevelTitle(userLevel);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-info">
          <div className="avatar-section">
                         <img
               src={`/avatars/${user.avatar_key}.svg`}
               alt={user.display_name}
               className="profile-avatar"
             />
            <div className="level-badge">
              lvl {userLevel}
            </div>
          </div>
          <div className="user-details">
            <h1>{user.display_name}</h1>
            <p className="user-title">{levelTitle}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button onClick={handleSettings} className="btn btn-secondary">
            <Settings size={16} />
            Settings
          </button>
          <button onClick={handleLogout} className="btn btn-danger">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="progress-section">
        <div className="level-progress">
          <div className="progress-header">
            <h3>Level Progress</h3>
            <span className="xp-display">{user.total_xp || 0} XP</span>
          </div>
          <div 
            className="progress-bar"
            role="progressbar" 
            aria-valuenow={Math.round(levelProgress)} 
            aria-valuemin="0" 
            aria-valuemax="100"
            aria-label={`Level progress: ${Math.round(levelProgress)}% to next level`}
          >
            <div 
              className="progress-fill" 
              style={{ width: `${levelProgress}%` }}
            ></div>
            <span className="progress-text">{Math.round(levelProgress)}%</span>
          </div>
          <div className="progress-labels">
            <span>Level {userLevel}</span>
            <span>Level {userLevel + 1}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Trophy size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.modulesCompleted || 0}</div>
            <div className="stat-label">Modules Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Star size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.sectionsCompleted || 0}</div>
            <div className="stat-label">Sections Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.quizzesPassed || 0}</div>
            <div className="stat-label">Quizzes Passed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.daysActive || 0}</div>
            <div className="stat-label">Days Active</div>
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          {achievements.length > 0 ? (
            achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}
              >
                <div className="achievement-icon">
                  <Award size={24} />
                </div>
                <div className="achievement-content">
                  <h4>{achievement.title}</h4>
                  <p>{achievement.description}</p>
                  {achievement.earned && (
                    <span className="earned-date">
                      Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-achievements">
              <Award size={48} />
              <h3>No achievements yet</h3>
              <p>Complete modules and quizzes to earn achievements!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
