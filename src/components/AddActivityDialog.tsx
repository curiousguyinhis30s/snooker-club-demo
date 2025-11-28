import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Activity } from '../types';
import { iconPack, colorSchemes, generateActivityId } from '../config/activities';

interface AddActivityDialogProps {
  onClose: () => void;
  onAdd: (activity: Activity) => void;
  existingActivities: Activity[];
}

export default function AddActivityDialog({ onClose, onAdd, existingActivities }: AddActivityDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎱');
  const [color, setColor] = useState('green');
  const [defaultRate, setDefaultRate] = useState(15);
  const [stationCount, setStationCount] = useState(2);
  const [stationType, setStationType] = useState('Table');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter activity name');
      return;
    }

    const id = generateActivityId(name);

    // Check if ID already exists
    if (existingActivities.some(a => a.id === id)) {
      alert('An activity with this name already exists');
      return;
    }

    const newActivity: Activity = {
      id,
      name: name.trim(),
      icon,
      color,
      gradient: colorSchemes[color as keyof typeof colorSchemes].gradient,
      defaultRate,
      stationCount,
      stationType,
      enabled: true,
      order: existingActivities.length + 1,
    };

    onAdd(newActivity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">Add New Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Activity Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Billiards, Chess, Basketball"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {Object.keys(iconPack).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                    icon === emoji ? 'bg-slate-100 ring-2 ring-slate-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Selected: {icon}</p>
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(colorSchemes).map(([key, scheme]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={`h-10 rounded-lg transition-all ${scheme.bgClass} ${
                    color === key ? 'ring-4 ring-offset-2 ring-gray-400 scale-105' : ''
                  }`}
                  title={key}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1 capitalize">Selected: {color}</p>
          </div>

          {/* Default Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Hourly Rate (SAR)
            </label>
            <input
              type="number"
              value={defaultRate}
              onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
              min="0"
              step="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Station Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Stations
            </label>
            <input
              type="number"
              value={stationCount}
              onChange={(e) => setStationCount(parseInt(e.target.value) || 1)}
              min="1"
              max="50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Station Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Station Type
            </label>
            <select
              value={stationType}
              onChange={(e) => setStationType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="Table">Table</option>
              <option value="Board">Board</option>
              <option value="Lane">Lane</option>
              <option value="Court">Court</option>
              <option value="Machine">Machine</option>
              <option value="Room">Room</option>
              <option value="Course">Course</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Preview:</p>
            <div className={`bg-gradient-to-r ${colorSchemes[color as keyof typeof colorSchemes].gradient} text-white p-4 rounded-lg`}>
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{icon}</span>
                <div>
                  <div className="font-bold">{name || 'Activity Name'}</div>
                  <div className="text-sm opacity-90">{stationCount} {stationType}s • {defaultRate} SAR/hr</div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Activity</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
