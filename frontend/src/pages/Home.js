import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  Target,
  Star,
  Award
} from 'lucide-react';
import axios from 'axios';
import './Home.css';

function Home() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get('/api/modules', { withCredentials: true });
      // Ensure we always set an array
      const modulesData = Array.isArray(response.data) ? response.data : [];
      setModules(modulesData);
      
      // Calculate overall progress
      const totalSections = modulesData.reduce((sum, module) => sum + (module.section_count || 0), 0);
      const completedSections = modulesData.reduce((sum, module) => sum + (module.completed_sections || 0), 0);
      const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
      setOverallProgress(progress);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setModules([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="home-container">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="user-info">
            <div className="avatar-container">
              <img
                src={`/avatars/${user.avatar_key || 'robot_coral'}.svg`}
                alt="User Avatar"
                className="user-avatar"
                onError={(e) => {
                  console.error(`Failed to load avatar: ${user.avatar_key}`);
                  e.target.src = '/avatars/robot_coral.svg';
                }}
              />
            </div>
            <div className="user-details">
              <h1>Welcome back, {user.display_name}!</h1>
              <p className="user-level">Level {user.level || 1} • {user.total_xp || 0} XP</p>
            </div>
          </div>
          
          <div className="progress-section">
            <div 
              className="progress-bar" 
              role="progressbar" 
              aria-valuenow={overallProgress} 
              aria-valuemin="0" 
              aria-valuemax="100"
              aria-label={`Overall learning progress: ${overallProgress}% complete`}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${overallProgress}%` }}
              ></div>
              <span className="progress-text">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </div>



      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/modules" className="action-card">
            <BookOpen className="action-icon" />
            <h3>Continue Learning</h3>
            <p>Pick up where you left off</p>
          </Link>
          
          <Link to="/leaderboard" className="action-card">
            <Trophy className="action-icon" />
            <h3>View Leaderboard</h3>
            <p>See how you rank</p>
          </Link>
          
          <Link to="/profile" className="action-card">
            <Star className="action-icon" />
            <h3>Update Profile</h3>
            <p>Customize your avatar</p>
          </Link>
        </div>
      </div>

      {/* Recent Progress */}
      <div className="recent-progress">
        <h2>Your Progress</h2>
        <div className="modules-grid">
          {Array.isArray(modules) && modules.slice(0, 3).map((module) => (
            <div key={module.id} className="module-card">
              <div className="module-header">
                <h3>{module.display_name}</h3>
                <span className="completion-badge">
                  {module.completion_percentage}%
                </span>
              </div>
              <div className="module-progress">
                <div 
                  className="progress-bar"
                  role="progressbar" 
                  aria-valuenow={module.completion_percentage} 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                  aria-label={`${module.display_name} progress: ${module.completion_percentage}% complete`}
                >
                  <div 
                    className="progress-fill" 
                    style={{ width: `${module.completion_percentage}%` }}
                  ></div>
                  <span className="progress-text">{module.completion_percentage}%</span>
                </div>
                <p>{module.completed_sections} of {module.section_count} sections completed</p>
              </div>
              <Link to={`/modules/${module.id}`} className="btn btn-secondary">
                Continue
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
