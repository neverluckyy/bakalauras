import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAdmin } from '../contexts/AuthContext';
import { Shield, Users, BookCopy, BarChart2 } from 'lucide-react';

function AdminLayout() {
  const isAdmin = useAdmin();

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const navLinks = [
    { to: '/admin/dashboard', icon: BarChart2, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/content', icon: BookCopy, label: 'Content Management' },
  ];

  return (
    <div className="admin-layout p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-indigo-500" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <p className="text-gray-400 mt-1">Manage your application from one place.</p>
      </header>

      <nav className="mb-6 border-b border-gray-700">
        <ul className="flex items-center space-x-2 sm:space-x-4">
          {navLinks.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-t-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-gray-800 text-white border-b-2 border-indigo-500'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <link.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="bg-gray-900 p-4 sm:p-6 rounded-lg shadow-inner">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
