import { useState } from 'react';
import { UserPlus, Shield, User, Trash2, ToggleLeft, ToggleRight, Users, KeyRound } from 'lucide-react';
import { getOwners, getEmployees, createOwner, createEmployee, updateEmployeeStatus, deleteEmployee, updateOwnerStatus, deleteOwner, resetEmployeePin, resetOwnerPin } from '../lib/auth';
import type { User as UserType, UserRole } from '../types';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

interface UserManagementProps {
  currentUser: UserType;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const { showToast } = useToast();
  const isSuperAdmin = currentUser.role === 'superadmin';
  const isOwner = currentUser.role === 'owner';

  const [showAddModal, setShowAddModal] = useState(false);
  const [userTypeToAdd, setUserTypeToAdd] = useState<'owner' | 'employee'>('employee');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    employeeId: '',
    pin: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset PIN Modal state
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetPinUser, setResetPinUser] = useState<UserType | null>(null);
  const [newPin, setNewPin] = useState('');

  // Get all users that current user can manage
  // SuperAdmin can see both owners and employees
  // Owner can only see employees
  // Use refreshKey to force re-fetch when users are added/updated
  const owners = isSuperAdmin ? getOwners() : [];
  const employees = getEmployees();
  const allUsers = isSuperAdmin ? [...owners, ...employees] : employees;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isSuperAdmin && userTypeToAdd === 'owner') {
        // SuperAdmin creating Owner
        if (!formData.name || !formData.username || !formData.pin) {
          setError('Please fill all fields');
          return;
        }
        if (formData.pin.length !== 6) {
          setError('PIN must be 6 digits');
          return;
        }
        const newOwner = createOwner(formData.name, formData.username, formData.pin, currentUser.id);
        setSuccess(`Owner "${formData.name}" created successfully!`);
      } else {
        // SuperAdmin or Owner creating Employee
        if (!formData.name || !formData.employeeId || !formData.pin) {
          setError('Please fill all fields');
          return;
        }
        if (formData.pin.length !== 6) {
          setError('PIN must be 6 digits');
          return;
        }
        const newEmployee = createEmployee(formData.name, formData.employeeId, formData.pin, currentUser.id);
        setSuccess(`Employee "${formData.name}" created successfully!`);
      }

      // Reset form
      setFormData({ name: '', username: '', employeeId: '', pin: '' });
      setShowAddModal(false);

      // Force re-render to show new user in the list
      setRefreshKey(prev => prev + 1);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      console.error('User creation error:', err);
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      if (user.role === 'employee' && user.employeeId) {
        updateEmployeeStatus(user.employeeId, !currentStatus);
        setSuccess(`Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else if (user.role === 'owner') {
        updateOwnerStatus(user.id, !currentStatus);
        setSuccess(`Owner ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      }
      setRefreshKey(prev => prev + 1);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDelete = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    const userType = user?.role === 'owner' ? 'Owner' : 'Employee';

    if (confirm(`Are you sure you want to delete this ${userType}? This action cannot be undone.`)) {
      if (user) {
        if (user.role === 'employee' && user.employeeId) {
          deleteEmployee(user.employeeId);
          setSuccess('Employee deleted successfully');
        } else if (user.role === 'owner') {
          deleteOwner(user.id);
          setSuccess('Owner deleted successfully');
        }
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  // Open Reset PIN modal
  const openResetPinModal = (user: UserType) => {
    setResetPinUser(user);
    setNewPin('');
    setError('');
    setShowResetPinModal(true);
  };

  // Handle Reset PIN submission
  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resetPinUser) return;

    try {
      if (newPin.length !== 6) {
        setError('PIN must be 6 digits');
        return;
      }

      if (resetPinUser.role === 'employee' && resetPinUser.employeeId) {
        resetEmployeePin(resetPinUser.employeeId, newPin);
        setSuccess(`PIN reset successfully for ${resetPinUser.name}`);
      } else if (resetPinUser.role === 'owner') {
        resetOwnerPin(resetPinUser.id, newPin);
        setSuccess(`PIN reset successfully for ${resetPinUser.name}`);
      }

      setShowResetPinModal(false);
      setResetPinUser(null);
      setNewPin('');
      setRefreshKey(prev => prev + 1);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN');
    }
  };

  return (
    <div className="h-full bg-gray-50 p-3 lg:p-6 overflow-y-auto" key={refreshKey}>
      <div className="w-full max-w-full">
        <PageHeader
          title="User Management"
          description={isSuperAdmin ? 'Manage owners & employees' : 'Manage employees'}
          icon={<Users className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" />}
          actions={
            <>
              {isSuperAdmin && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setUserTypeToAdd('owner');
                      setShowAddModal(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5 lg:w-4 lg:h-4 lg:mr-1.5" />
                    <span className="hidden lg:inline">Add</span> Owner
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setUserTypeToAdd('employee');
                      setShowAddModal(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5 lg:w-4 lg:h-4 lg:mr-1.5" />
                    <span className="hidden lg:inline">Add</span> Employee
                  </Button>
                </>
              )}
              {isOwner && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setUserTypeToAdd('employee');
                    setShowAddModal(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5 lg:w-4 lg:h-4 lg:mr-1.5" />
                  <span className="hidden lg:inline">Add</span> Employee
                </Button>
              )}
            </>
          }
        />

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4">
            {isSuperAdmin && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-sm">
                  All Users ({allUsers.length})
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                    {owners.length} Owners
                  </span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-900 rounded-md">
                    {employees.length} Employees
                  </span>
                </div>
              </div>
            )}
            {isOwner && (
              <h3 className="font-medium text-gray-900 text-sm mb-3 pb-3 border-b border-gray-100">
                All Employees ({employees.length})
              </h3>
            )}

            {allUsers.length === 0 ? (
              <div className="text-center py-6 lg:py-8">
                <User className="w-8 h-8 lg:w-10 lg:h-10 text-gray-300 mx-auto mb-2 lg:mb-3" />
                <p className="text-xs lg:text-sm text-gray-500">
                  No users yet. Click "Add" to create one.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 lg:space-y-2">
                {allUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 lg:p-3 border rounded-lg transition-all ${
                      user.active
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                      <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-md lg:rounded-lg flex items-center justify-center flex-shrink-0 ${
                        user.role === 'owner' ? 'bg-gray-100' : 'bg-slate-50'
                      }`}>
                        {user.role === 'owner' ? (
                          <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-800" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          <h4 className="font-medium text-gray-900 text-xs lg:text-sm truncate">{user.name}</h4>
                          <span className={`px-1 lg:px-1.5 py-0.5 rounded text-[10px] lg:text-xs font-medium flex-shrink-0 ${
                            user.role === 'owner'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-slate-50 text-slate-900'
                          }`}>
                            {user.role === 'owner' ? 'Owner' : 'Emp'}
                          </span>
                          {/* Status dot for mobile, badge for desktop */}
                          <span className={`lg:hidden w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            user.active ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className={`hidden lg:inline px-2 py-0.5 rounded text-xs font-medium ${
                            user.active
                              ? 'bg-green-50 text-green-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[10px] lg:text-xs text-gray-500 truncate">
                          {user.role === 'owner' ? user.username : user.employeeId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0 ml-2">
                      {((isOwner && user.role === 'employee') || (isSuperAdmin && (user.role === 'employee' || user.role === 'owner'))) && (
                        <>
                          <button
                            onClick={() => openResetPinModal(user)}
                            className="p-1 lg:p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded transition-all"
                            title="Reset PIN"
                          >
                            <KeyRound className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(user.id, user.active)}
                            className={`p-1 lg:p-1.5 rounded transition-all ${
                              user.active
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                : 'bg-green-50 hover:bg-green-100 text-green-600'
                            }`}
                            title={user.active ? 'Deactivate' : 'Activate'}
                          >
                            {user.active ? (
                              <ToggleRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1 lg:p-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded transition-all"
                            title={`Delete ${user.role === 'owner' ? 'Owner' : 'Employee'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New {userTypeToAdd === 'owner' ? 'Owner' : 'Employee'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800 outline-none"
                  placeholder="Enter full name"
                />
              </div>

              {userTypeToAdd === 'owner' ? (
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800 outline-none"
                    placeholder="Choose a username"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800 outline-none"
                    placeholder="Enter unique employee ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  PIN (6 digits) *
                </label>
                <input
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800 outline-none"
                  placeholder="••••••"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setFormData({ name: '', username: '', employeeId: '', pin: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm rounded-md font-medium text-sm transition-all shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && resetPinUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reset PIN</h3>
                <p className="text-sm text-gray-500">{resetPinUser.name} ({resetPinUser.role})</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  New PIN (6 digits) *
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  placeholder="••••••"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  PIN must be exactly 6 digits
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPinModal(false);
                    setResetPinUser(null);
                    setNewPin('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium text-sm transition-all"
                >
                  Reset PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
