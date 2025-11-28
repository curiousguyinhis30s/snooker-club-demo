import { useState, useMemo } from 'react';
import { Search, UserPlus, Edit2, Trash2, Phone, Mail, Calendar, DollarSign, TrendingUp, Award, Clock, X } from 'lucide-react';
import type { Customer, Settings } from '../types';
import { store } from '../lib/store';
import { financeStore } from '../lib/financeStore';
import { formatCurrency } from '../lib/currency';
import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../components/ui/ConfirmationModal';

interface CustomerManagementProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export default function CustomerManagement({ settings, onUpdateSettings }: CustomerManagementProps) {
  const { showToast } = useToast();
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const customers = store.getCustomers();
  const transactions = financeStore.getSalesTransactions();

  // Calculate customer analytics
  const customerAnalytics = useMemo(() => {
    return customers.map(customer => {
      const customerTransactions = transactions.filter(
        t => t.customerName === customer.name || t.customerPhone === customer.phone
      );

      const totalSpent = customerTransactions.reduce((sum, t) => sum + t.total, 0);
      const visitCount = customerTransactions.length;
      const lastVisit = customerTransactions.length > 0
        ? Math.max(...customerTransactions.map(t => new Date(t.date).getTime()))
        : customer.lastVisit || customer.createdAt;

      const avgSessionValue = visitCount > 0 ? totalSpent / visitCount : 0;

      // Calculate favorite activity
      const activityCounts: Record<string, number> = {};
      customerTransactions.forEach(t => {
        activityCounts[t.activityName] = (activityCounts[t.activityName] || 0) + 1;
      });
      const favoriteActivity = Object.keys(activityCounts).length > 0
        ? Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0][0]
        : 'None';

      return {
        ...customer,
        totalSpent,
        visitCount,
        lastVisit,
        avgSessionValue,
        favoriteActivity,
        transactions: customerTransactions,
      };
    });
  }, [customers, transactions]);

  // Filter customers based on search
  const filteredCustomers = customerAnalytics.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort by total spent (high to low)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => b.totalSpent - a.totalSpent);

  // Calculate top customers stats
  const topCustomers = sortedCustomers.slice(0, 5);
  const totalCustomers = customers.length;
  const totalRevenue = sortedCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const handleAddCustomer = () => {
    if (!formData.name || !formData.phone) {
      showToast('Name and phone are required', 'error');
      return;
    }

    const customer = store.addCustomer(formData.name, formData.phone, formData.email);
    onUpdateSettings(store.getSettings());
    showToast(`Customer ${customer.name} added successfully!`, 'success');
    setShowAddModal(false);
    setFormData({ name: '', phone: '', email: '' });
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    showConfirmation(
      {
        title: 'Delete Customer',
        message: `Are you sure you want to delete ${customerName}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        confirmButtonVariant: 'danger',
      },
      () => {
        store.deleteCustomer(customerId);
        onUpdateSettings(store.getSettings());
        showToast(`Customer ${customerName} deleted`, 'success');
        if (selectedCustomer?.id === customerId) {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }
      }
    );
  };

  const handleViewDetails = (customer: typeof customerAnalytics[0]) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(`${dateStr}T${timeStr}`);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysSince = (timestamp: number) => {
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <ConfirmationModalComponent />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your customer database and analytics</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg per Customer</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgRevenuePerCustomer)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Top 5 Customers</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(topCustomers.reduce((sum, c) => sum + c.totalSpent, 0))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Session</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Favorite Activity</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? 'No customers found' : 'No customers yet. Add your first customer!'}
                  </td>
                </tr>
              ) : (
                sortedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(customer)}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                      >
                        {customer.name}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{customer.visitCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{formatCurrency(customer.avgSessionValue)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                        {customer.favoriteActivity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getDaysSince(customer.lastVisit)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Customer</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', phone: '', email: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', phone: '', email: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-sm"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Customer Profile & Visit History</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-600" />
                    <p className="text-sm font-medium text-gray-700">Total Spent</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-gray-700">Total Visits</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCustomer.visitCount}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                    <p className="text-sm font-medium text-gray-700">Avg Session Value</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedCustomer.avgSessionValue)}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{selectedCustomer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Customer since {formatDate(selectedCustomer.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Last visit: {getDaysSince(selectedCustomer.lastVisit)}</span>
                  </div>
                </div>
              </div>

              {/* Visit History */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Visit History ({selectedCustomer.transactions.length})</h4>
                <div className="bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                  {selectedCustomer.transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No visit history yet
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Activity</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Table</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedCustomer.transactions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDateTime(transaction.date, transaction.startTime)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{transaction.activityName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{transaction.tableNumber}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{transaction.duration} min</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                                {formatCurrency(transaction.total)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete Customer
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
