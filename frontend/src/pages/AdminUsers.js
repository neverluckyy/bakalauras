import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    is_admin: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users', { withCredentials: true });
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      display_name: user.display_name,
      email: user.email,
      is_admin: user.is_admin === 1,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await axios.put(`/api/admin/users/${selectedUser.id}`, formData, { withCredentials: true });
      fetchUsers(); // Refresh users list
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await axios.delete(`/api/admin/users/${selectedUser.id}`, { withCredentials: true });
      fetchUsers(); // Refresh users list
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="admin-users">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded-lg">
          <thead>
            <tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-300">ID</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-300">Email</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-300">Display Name</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-300">Admin</th>
              <th className="p-3 text-left text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700">
                <td className="p-3 text-sm">{user.id}</td>
                <td className="p-3 text-sm">{user.email}</td>
                <td className="p-3 text-sm">{user.display_name}</td>
                <td className="p-3 text-sm">{user.is_admin ? 'Yes' : 'No'}</td>
                <td className="p-3 text-sm">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    className="text-red-400 hover:text-red-300 ml-4"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleUpdateUser}>
          <div className="mb-4">
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              name="display_name"
              id="display_name"
              value={formData.display_name}
              onChange={handleFormChange}
              className="w-full bg-gray-700 text-white rounded-md p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleFormChange}
              className="w-full bg-gray-700 text-white rounded-md p-2"
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="is_admin"
              id="is_admin"
              checked={formData.is_admin}
              onChange={handleFormChange}
              className="h-4 w-4 rounded bg-gray-700 text-indigo-500"
            />
            <label htmlFor="is_admin" className="ml-2 text-sm text-gray-300">Is Admin?</label>
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 rounded-md py-2 px-4">Cancel</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-md py-2 px-4">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        <p>Are you sure you want to delete the user "{selectedUser?.email}"?</p>
        <div className="flex justify-end space-x-4 mt-4">
          <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 rounded-md py-2 px-4">Cancel</button>
          <button onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-500 rounded-md py-2 px-4">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminUsers;
