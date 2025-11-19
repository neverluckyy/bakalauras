import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Play } from 'lucide-react';
import axios from 'axios';
import './Modules.css';

function Modules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get('/api/modules', { withCredentials: true });
      // Ensure we always set an array
      const modulesData = Array.isArray(response.data) ? response.data : [];
      setModules(modulesData);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setModules([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (moduleName) => {
    if (moduleName.includes('Security Awareness')) return '🛡️';
    if (moduleName.includes('Phishing')) return '🎣';
    if (moduleName.includes('Business Email')) return '📧';
    return '📚';
  };

  const getModuleColor = (index) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="modules-container">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modules-container">
      <div className="modules-header">
        <h1>Learning Modules</h1>
        <p>Master the fundamentals of social engineering defense</p>
      </div>

      <div className="modules-grid">
        {Array.isArray(modules) && modules.map((module, index) => (
          <div key={module.id} className="module-card">
            <div 
              className="module-icon"
              style={{ background: getModuleColor(index) }}
            >
              <span className="module-emoji">{getModuleIcon(module.display_name)}</span>
            </div>
            
            <div className="module-content">
              <h3>{module.display_name}</h3>
              <p className="module-description">
                {module.description || 'Learn essential security concepts and best practices'}
              </p>
              
              <div className="module-stats">
                <div className="stat">
                  <BookOpen className="stat-icon" />
                  <span>{module.section_count} sections</span>
                </div>
                <div className="stat">
                  <CheckCircle className="stat-icon" />
                  <span>{module.completed_sections} completed</span>
                </div>
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
              </div>
              
              <Link 
                to={`/modules/${module.id}`} 
                className="btn btn-primary module-btn"
              >
                <Play className="btn-icon" />
                {module.completion_percentage === 100 ? 'Review' : 'Continue'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {(!Array.isArray(modules) || modules.length === 0) && (
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h3>No modules available</h3>
          <p>Check back later for new learning content</p>
        </div>
      )}
    </div>
  );
}

export default Modules;
