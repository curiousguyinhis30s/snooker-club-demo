import { useState } from 'react';
import { Plus, Trash2, Edit2, Activity as ActivityIcon, Eye, EyeOff } from 'lucide-react';
import type { Activity, Settings } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../components/ui/ConfirmationModal';
import { store } from '../lib/store';

interface ActivityManagementProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

const AVAILABLE_ICONS = ['🎱', '🎯', '🏓', '🎳', '🎮', '🎲', '🃏', '🎰', '🎪', '🎭', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥊', '🥋', '⛳'];

export default function ActivityManagement({ settings, onSave }: ActivityManagementProps) {
  const { showToast } = useToast();
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation();
  const [activities, setActivities] = useState<Activity[]>(settings.activities || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '🎱',
    stationCount: 3,
    defaultRate: 30,
    enabled: true,
  });

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      icon: '🎱',
      stationCount: 3,
      defaultRate: 30,
      enabled: true,
    });
  };

  const handleAdd = () => {
    if (!formData.name || !formData.icon) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const newActivity: Activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: formData.name,
      icon: formData.icon,
      stationCount: formData.stationCount,
      defaultRate: formData.defaultRate,
      enabled: formData.enabled,
    };

    const updatedActivities = [...activities, newActivity];
    setActivities(updatedActivities);

    const updatedSettings = {
      ...settings,
      activities: updatedActivities,
    };

    store.saveSettings(updatedSettings);
    onSave(updatedSettings);

    showToast(`Activity "${formData.name}" created successfully!`, 'success');
    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setFormData({
      id: activity.id,
      name: activity.name,
      icon: activity.icon,
      stationCount: activity.stationCount,
      defaultRate: activity.defaultRate,
      enabled: activity.enabled,
    });
    setShowAddModal(true);
  };

  const handleUpdate = () => {
    if (!formData.name || !formData.icon) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const updatedActivities = activities.map(a =>
      a.id === editingId
        ? { ...a, name: formData.name, icon: formData.icon, stationCount: formData.stationCount, defaultRate: formData.defaultRate }
        : a
    );

    setActivities(updatedActivities);

    const updatedSettings = {
      ...settings,
      activities: updatedActivities,
    };

    store.saveSettings(updatedSettings);
    onSave(updatedSettings);

    showToast(`Activity "${formData.name}" updated successfully!`, 'success');
    setShowAddModal(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    showConfirmation(
      {
        title: 'Delete Activity',
        message: `Are you sure you want to delete "${activity.name}"? This will remove all associated stations.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        confirmButtonVariant: 'danger',
      },
      () => {
        const updatedActivities = activities.filter(a => a.id !== activityId);
        setActivities(updatedActivities);

        const updatedSettings = {
          ...settings,
          activities: updatedActivities,
        };

        // Clear tables to force regeneration
        localStorage.removeItem('snooker_tables');

        store.saveSettings(updatedSettings);
        onSave(updatedSettings);

        showToast(`Activity "${activity.name}" deleted successfully!`, 'success');

        // Reload to regenerate tables
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    );
  };

  const handleToggleEnabled = (activityId: string) => {
    const updatedActivities = activities.map(a =>
      a.id === activityId ? { ...a, enabled: !a.enabled } : a
    );

    setActivities(updatedActivities);

    const updatedSettings = {
      ...settings,
      activities: updatedActivities,
    };

    // Clear tables to force regeneration
    localStorage.removeItem('snooker_tables');

    store.saveSettings(updatedSettings);
    onSave(updatedSettings);

    const activity = activities.find(a => a.id === activityId);
    showToast(`Activity "${activity?.name}" ${!activity?.enabled ? 'enabled' : 'disabled'}`, 'success');

    // Reload to update sidebar
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const totalStations = activities.filter(a => a.enabled).reduce((sum, a) => sum + a.stationCount, 0);
  const enabledCount = activities.filter(a => a.enabled).length;

  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden flex flex-col">
      <ConfirmationModalComponent />
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-5 h-5 text-slate-800" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Activity Management</h1>
            <p className="text-[10px] text-gray-500">Create and manage custom activities</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowAddModal(true); }}
          className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Activity
        </button>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-[10px] text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900">{activities.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-[10px] text-gray-500">Active</p>
          <p className="text-lg font-bold text-slate-800">{enabledCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-[10px] text-gray-500">Stations</p>
          <p className="text-lg font-bold text-gray-700">{totalStations}</p>
        </div>
      </div>

      {/* Activities Grid - Scrollable */}
      <div className="flex-1 overflow-auto">
        {activities.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <ActivityIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-3">No activities yet</p>
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowAddModal(true); }}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm"
            >
              <Plus className="w-3 h-3 inline mr-1" /> Create Activity
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`bg-white rounded-lg border p-2.5 ${activity.enabled ? 'border-slate-200' : 'border-gray-200 opacity-60'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xl">{activity.icon}</span>
                  {activity.enabled ? (
                    <Eye className="w-3.5 h-3.5 text-slate-800" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <h3 className="font-medium text-gray-900 text-xs truncate mb-1">{activity.name}</h3>
                <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                  <span>{activity.stationCount} stations</span>
                  <span>{settings.currency}{activity.defaultRate}/hr</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleEnabled(activity.id)}
                    className={`flex-1 px-2 py-1 rounded text-[10px] font-medium ${
                      activity.enabled ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {activity.enabled ? 'Off' : 'On'}
                  </button>
                  <button onClick={() => handleEdit(activity)} className="p-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(activity.id)} className="p-1 bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-[380px] p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              {editingId ? 'Edit Activity' : 'New Activity'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Pool Table"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-1">Icon</label>
                <div className="grid grid-cols-10 gap-1">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`text-lg p-1 rounded ${formData.icon === icon ? 'bg-slate-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Stations</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.stationCount}
                    onChange={(e) => setFormData({ ...formData, stationCount: parseInt(e.target.value) || 1 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Rate ({settings.currency}/hr)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.defaultRate}
                    onChange={(e) => setFormData({ ...formData, defaultRate: parseFloat(e.target.value) || 1 })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowAddModal(false); setEditingId(null); resetForm(); }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
