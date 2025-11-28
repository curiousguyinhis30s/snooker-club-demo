import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Plus, ChevronLeft, ChevronRight, Check, X, AlertCircle, LogIn, Trash2, Edit2 } from 'lucide-react';
import type { Reservation, Activity, Settings } from '../types';
import { reservationStore } from '../lib/reservationStore';
import { formatCurrencyCompact } from '../lib/currency';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';

interface ReservationsProps {
  settings: Settings;
}

export default function Reservations({ settings }: ReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [view, setView] = useState<'day' | 'week'>('day');
  const { showToast } = useToast();

  const activities = settings.activities?.filter(a => a.enabled) || [];

  useEffect(() => {
    loadReservations();
  }, [selectedDate, view]);

  const loadReservations = () => {
    if (view === 'day') {
      setReservations(reservationStore.getByDate(selectedDate));
    } else {
      const startOfWeek = getStartOfWeek(selectedDate);
      const endOfWeek = getEndOfWeek(selectedDate);
      setReservations(reservationStore.getByDateRange(startOfWeek, endOfWeek));
    }
  };

  const getStartOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const getEndOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() + (6 - day);
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (view === 'day') {
      date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'checked-in': return 'bg-slate-100 text-slate-900 border-slate-200';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-600 border-red-200';
      case 'no-show': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleConfirm = (id: string) => {
    reservationStore.confirm(id);
    loadReservations();
    showToast('Reservation confirmed', 'success');
  };

  const handleCheckIn = (id: string) => {
    reservationStore.checkIn(id);
    loadReservations();
    showToast('Customer checked in', 'success');
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      reservationStore.cancel(id, 'Cancelled by staff');
      loadReservations();
      showToast('Reservation cancelled', 'info');
    }
  };

  const handleNoShow = (id: string) => {
    reservationStore.markNoShow(id);
    loadReservations();
    showToast('Marked as no-show', 'warning');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this reservation? This cannot be undone.')) {
      reservationStore.delete(id);
      loadReservations();
      showToast('Reservation deleted', 'info');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

  // Sort reservations by time
  const sortedReservations = [...reservations].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  // Group by status for quick overview
  const stats = {
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    checkedIn: reservations.filter(r => r.status === 'checked-in').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reservations</h1>
              <p className="text-sm text-gray-500">Manage table bookings and appointments</p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('day')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    view === 'day' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    view === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setSelectedDate(today)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isToday ? 'bg-slate-100 text-slate-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  setEditingReservation(null);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Reservation
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-slate-800 text-xs font-medium mb-1">Pending</div>
            <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-blue-600 text-xs font-medium mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-blue-700">{stats.confirmed}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-slate-900 text-xs font-medium mb-1">Checked In</div>
            <div className="text-2xl font-bold text-slate-900">{stats.checkedIn}</div>
          </div>
        </div>

        {/* Date Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {view === 'day' ? formatDate(selectedDate) : `Week of ${formatDate(getStartOfWeek(selectedDate))}`}
          </h2>
          <span className="text-sm text-gray-500">
            {sortedReservations.length} reservation{sortedReservations.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Reservations List */}
        {sortedReservations.length === 0 ? (
          <EmptyState
            iconType="calendar"
            title="No reservations"
            description={`No reservations for ${view === 'day' ? 'this day' : 'this week'}. Create one to get started.`}
            action={
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white shadow-sm rounded-lg text-sm font-medium transition-colors"
              >
                Create Reservation
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {sortedReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(reservation.status)}`}>
                        {reservation.status.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">{reservation.activityName}</span>
                      {reservation.tableNumber && (
                        <span className="text-sm text-gray-500">• {reservation.tableNumber}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{reservation.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{reservation.customerPhone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(reservation.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                      </div>
                      <span>{reservation.numberOfPlayers} player{reservation.numberOfPlayers !== 1 ? 's' : ''}</span>
                    </div>

                    {reservation.notes && (
                      <p className="mt-2 text-sm text-gray-500 italic">Note: {reservation.notes}</p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {reservation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleConfirm(reservation.id)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                          title="Confirm"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(reservation.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {reservation.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleCheckIn(reservation.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition-colors"
                          title="Check In"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNoShow(reservation.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                          title="No Show"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {!['completed', 'cancelled', 'no-show'].includes(reservation.status) && (
                      <button
                        onClick={() => {
                          setEditingReservation(reservation);
                          setShowModal(true);
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(reservation.id)}
                      className="p-2 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {showModal && (
        <ReservationModal
          activities={activities}
          reservation={editingReservation}
          selectedDate={selectedDate}
          onClose={() => {
            setShowModal(false);
            setEditingReservation(null);
          }}
          onSave={() => {
            loadReservations();
            setShowModal(false);
            setEditingReservation(null);
            showToast(editingReservation ? 'Reservation updated' : 'Reservation created', 'success');
          }}
        />
      )}
    </div>
  );
}

// Reservation Modal Component
interface ReservationModalProps {
  activities: Activity[];
  reservation: Reservation | null;
  selectedDate: string;
  onClose: () => void;
  onSave: () => void;
}

function ReservationModal({ activities, reservation, selectedDate, onClose, onSave }: ReservationModalProps) {
  const [formData, setFormData] = useState({
    customerName: reservation?.customerName || '',
    customerPhone: reservation?.customerPhone || '',
    activityId: reservation?.activityId || activities[0]?.id || '',
    date: reservation?.date || selectedDate,
    startTime: reservation?.startTime || '10:00',
    duration: reservation?.duration || 60,
    numberOfPlayers: reservation?.numberOfPlayers || 2,
    notes: reservation?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedActivity = activities.find(a => a.id === formData.activityId);

  const calculateEndTime = (start: string, durationMins: number) => {
    const [hours, mins] = start.split(':').map(Number);
    const totalMins = hours * 60 + mins + durationMins;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMins = totalMins % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const endTime = calculateEndTime(formData.startTime, formData.duration);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    if (!formData.activityId) newErrors.activityId = 'Activity is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';

    // Check availability
    if (!reservation && !reservationStore.isTimeSlotAvailable(
      formData.date,
      formData.startTime,
      endTime,
      formData.activityId
    )) {
      newErrors.startTime = 'This time slot is not available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (reservation) {
      reservationStore.update(reservation.id, {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        activityId: formData.activityId,
        activityName: selectedActivity?.name || '',
        date: formData.date,
        startTime: formData.startTime,
        endTime,
        duration: formData.duration,
        numberOfPlayers: formData.numberOfPlayers,
        notes: formData.notes,
      });
    } else {
      reservationStore.create({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        activityId: formData.activityId,
        activityName: selectedActivity?.name || '',
        date: formData.date,
        startTime: formData.startTime,
        endTime,
        duration: formData.duration,
        numberOfPlayers: formData.numberOfPlayers,
        notes: formData.notes,
        createdBy: 'Staff', // TODO: Use current user
      });
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {reservation ? 'Edit Reservation' : 'New Reservation'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.customerName ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="John Doe"
              />
              {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.customerPhone ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="+1 234 567 8900"
              />
              {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
            </div>
          </div>

          {/* Activity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select
              value={formData.activityId}
              onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.icon} {activity.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.startTime ? 'border-red-500' : 'border-gray-200'}`}
              />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
          </div>

          {/* Players */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Players</label>
            <select
              value={formData.numberOfPlayers}
              onChange={(e) => setFormData({ ...formData, numberOfPlayers: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} player{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              rows={2}
              placeholder="Special requests, preferences..."
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Time Slot</span>
              <span className="font-medium text-gray-900">
                {formData.startTime} - {endTime}
              </span>
            </div>
            {selectedActivity && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Estimated Cost</span>
                <span className="font-medium text-gray-900">
                  {formatCurrencyCompact((formData.duration / 60) * selectedActivity.defaultRate)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white shadow-sm rounded-lg font-medium text-sm transition-colors"
            >
              {reservation ? 'Update Reservation' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
