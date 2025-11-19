import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';

import { BookOpen, Play, CheckCircle, Lock } from 'lucide-react';
import axios from 'axios';
import './ModuleDetail.css';

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const location = useLocation();

  const [module, setModule] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModuleData = async () => {
    try {
      const [moduleRes, sectionsRes] = await Promise.all([
        axios.get(`/api/modules/${moduleId}`),
        axios.get(`/api/modules/${moduleId}/sections`)
      ]);
      
      setModule(moduleRes.data);
      
      // Remove duplicates by section ID to ensure no duplicates appear
      const uniqueSections = sectionsRes.data.filter((section, index, self) => 
        index === self.findIndex(s => s.id === section.id)
      );
      
      setSections(uniqueSections);
    } catch (err) {
      setError('Failed to load module data');
      console.error('Error fetching module:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModuleData();
  }, [moduleId]);

  // Refresh data when returning from quiz completion
  useEffect(() => {
    if (location.state?.refresh && !loading) {
      fetchModuleData();
      // Clear the refresh state
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.refresh, loading]);

  if (loading) {
    return (
      <div className="module-detail-container">
        <div className="loading">Loading module...</div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="module-detail-container">
        <div className="error">{error || 'Module not found'}</div>
      </div>
    );
  }

  const getSectionIcon = (section) => {
    if (section.completed) return <CheckCircle className="section-icon completed" />;
    return <Play className="section-icon available" />;
  };

  const getSectionStatus = (section) => {
    if (section.completed) return 'completed';
    return 'available';
  };

  return (
    <div className="module-detail-container">
      <div className="module-header">
        <div className="module-info">
          <h1>{module.title}</h1>
          <p className="module-description">{module.description}</p>
          <div className="module-stats">
            <span className="stat">
              <BookOpen size={16} />
              {sections.length} sections
            </span>
            <span className="stat">
              <CheckCircle size={16} />
              {sections.filter(s => s.completed).length} completed
            </span>
          </div>
        </div>
        <div className="module-progress">
          <div className="progress-circle">
            <svg viewBox="0 0 36 36" className="progress-ring">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeDasharray={`${(sections.filter(s => s.completed).length / sections.length) * 100}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="progress-text">
              {Math.round((sections.filter(s => s.completed).length / sections.length) * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="sections-list">
        <h2>Learning Sections</h2>
        {sections
          .filter((section, index, self) => 
            index === self.findIndex(s => s.id === section.id)
          )
          .map((section, index) => (
          <div
            key={section.id}
            className={`section-card ${getSectionStatus(section)}`}
          >
            <div className="section-content">
              <div className="section-icon-container">
                {getSectionIcon(section)}
              </div>
              
              <div className="section-info">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              
              <div className="section-meta">
                <span className="section-number">Section {index + 1}</span>
                {section.completed && (
                  <span className="completion-badge">Completed</span>
                )}
              </div>
              
              <div className="section-actions">
                {section.completed ? (
                  <Link
                    to={`/sections/${section.id}/quiz`}
                    className="btn btn-secondary"
                  >
                    Retake Quiz
                  </Link>
                ) : section.available ? (
                  <div className="action-buttons">
                    <Link
                      to={`/sections/${section.id}/learn`}
                      className="btn btn-primary"
                    >
                      Start Learning
                    </Link>
                  </div>
                ) : (
                  <div className="locked-message">
                    Complete previous sections to unlock
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleDetail;
