import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Award, Star, TrendingUp } from 'lucide-react';
import axios from 'axios';
import './Leaderboard.css';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get('/api/leaderboard');
        // Ensure we always set an array
        setLeaderboard(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Error fetching leaderboard:', err);
        setLeaderboard([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="rank-icon gold" />;
      case 2:
        return <Medal className="rank-icon silver" />;
      case 3:
        return <Award className="rank-icon bronze" />;
      default:
        return <Star className="rank-icon" />;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return 'rank-1';
      case 2:
        return 'rank-2';
      case 3:
        return 'rank-3';
      default:
        return '';
    }
  };



  const getCurrentUserRank = () => {
    if (!Array.isArray(leaderboard) || !user?.id) return null;
    const userIndex = leaderboard.findIndex(entry => entry.id === user.id);
    return userIndex !== -1 ? userIndex + 1 : null;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <p>Top performers in social engineering learning</p>
      </div>

      <div className="leaderboard-stats">
        <div className="stat-card">
          <TrendingUp size={24} />
          <div className="stat-content">
            <div className="stat-value">{Array.isArray(leaderboard) ? leaderboard.length : 0}</div>
            <div className="stat-label">Active Learners</div>
          </div>
        </div>
        {currentUserRank && (
          <div className="stat-card">
            <Trophy size={24} />
            <div className="stat-content">
              <div className="stat-value">#{currentUserRank}</div>
              <div className="stat-label">Your Rank</div>
            </div>
          </div>
        )}
      </div>

      <div className="leaderboard-list">
        <div className="leaderboard-header-row">
          <div className="rank-header">Rank</div>
          <div className="user-header">User</div>
          <div className="xp-header">XP</div>
        </div>

        {Array.isArray(leaderboard) && leaderboard.map((entry, index) => {
          const rank = index + 1;
          const isCurrentUser = entry.id === user?.id;
          
          return (
            <div
              key={entry.id}
              className={`leaderboard-entry ${getRankClass(rank)} ${
                isCurrentUser ? 'current-user' : ''
              }`}
            >
              <div className="rank-column">
                <div className="rank-number">
                  {getRankIcon(rank)}
                  <span>{rank}</span>
                </div>
              </div>

              <div className="user-column">
                <div className="user-info">
                  <img
                    src={`/avatars/${entry.avatar_key || 'robot_coral'}.svg`}
                    alt={entry.display_name}
                    className="user-avatar"
                    onError={(e) => {
                      console.error(`Failed to load avatar: ${entry.avatar_key}`);
                      e.target.src = '/avatars/robot_coral.svg';
                    }}
                  />
                  <div className="user-details">
                    <div className="user-name">
                      {entry.display_name}
                      {isCurrentUser && <span className="you-badge">You</span>}
                    </div>
                    <div className="user-email">{entry.email}</div>
                  </div>
                </div>
              </div>

              <div className="xp-column">
                <div className="xp-amount">{entry.xp.toLocaleString()}</div>
                <div className="xp-label">XP</div>
                {index > 0 && leaderboard.length > 0 && (
                  <div className="xp-progress">
                    <div 
                      className="progress-bar"
                      role="progressbar" 
                      aria-valuenow={Math.round(Math.min((entry.xp / leaderboard[0].xp) * 100, 100))} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                      aria-label={`${entry.display_name} XP progress: ${Math.round(Math.min((entry.xp / leaderboard[0].xp) * 100, 100))}% of top performer`}
                    >
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${Math.min((entry.xp / leaderboard[0].xp) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(!Array.isArray(leaderboard) || leaderboard.length === 0) && (
        <div className="empty-state">
          <Trophy size={48} />
          <h3>No rankings yet</h3>
          <p>Start learning to appear on the leaderboard!</p>
        </div>
      )}

      {!currentUserRank && user && (
        <div className="user-not-ranked">
          <div className="not-ranked-card">
            <h3>Your Progress</h3>
            <div className="user-progress">
                             <img
                 src={`/avatars/${user.avatar_key || 'robot_coral'}.svg`}
                 alt={user.display_name}
                 className="user-avatar"
               />
                            <div className="progress-details">
                <div className="user-name">{user.display_name}</div>
                <div className="user-xp">{user.total_xp || 0} XP</div>
              </div>
            </div>
            <p>Keep learning to climb the leaderboard!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
