import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  BookOpen, 
  Trophy, 
  User,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

function Sidebar({ isCollapsed, onToggle }) {
  const { logout, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && isMobileOpen && !event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-toggle')) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobile, isMobileOpen]);

  const navItems = [
    { path: '/', icon: Home, label: 'Home', category: 'LEARNING' },
    { path: '/modules', icon: BookOpen, label: 'Learn', category: 'LEARNING' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboards', category: 'LEARNING' },
    { path: '/profile', icon: User, label: 'Profile', category: 'ACCOUNT' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin', category: 'ACCOUNT' });
  }

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleLogout = () => {
    logout();
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile hamburger menu */}
      <button 
        className={`mobile-menu-toggle ${isMobileOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        <div className="hamburger"></div>
      </button>

      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-content">
          {!isMobile && (
            <div className="sidebar-toggle" onClick={onToggle}>
              {isCollapsed ? <ChevronRight className="toggle-icon" /> : <ChevronLeft className="toggle-icon" />}
            </div>
          )}
          
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="nav-section">
              {(!isCollapsed || isMobile) && <h3 className="nav-category">{category}</h3>}
              <nav className="nav-list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      title={isCollapsed && !isMobile ? item.label : ''}
                      onClick={() => isMobile && setIsMobileOpen(false)}
                    >
                      <Icon className="nav-icon" />
                      {(!isCollapsed || isMobile) && <span className="nav-label">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
          
          <div className="nav-section">
            <button 
              onClick={handleLogout} 
              className="nav-item logout-btn"
              title={isCollapsed && !isMobile ? 'Logout' : ''}
            >
              <LogOut className="nav-icon" />
              {(!isCollapsed || isMobile) && <span className="nav-label">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
