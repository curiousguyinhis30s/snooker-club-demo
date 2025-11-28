import { useState } from 'react';
import { UserPlus, Search, Edit2, Trash2, Phone, Mail, Calendar, Users, User, Award, Gift, Star } from 'lucide-react';
import { store } from '../lib/store';
import { loyaltyStore, getTierBenefits } from '../lib/loyaltyStore';
import { formatCurrency } from '../lib/currency';
import type { Customer, MembershipTier } from '../types';

// Tier badge styling
const getTierConfig = (tier: MembershipTier) => {
  switch (tier) {
    case 'platinum':
      return { bg: 'bg-purple-100', text: 'text-purple-700', icon: '💎' };
    case 'gold':
      return { bg: 'bg-slate-100', text: 'text-slate-800', icon: '🥇' };
    case 'silver':
      return { bg: 'bg-gray-200', text: 'text-gray-700', icon: '🥈' };
    case 'bronze':
    default:
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🥉' };
  }
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(store.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const loyaltyConfig = loyaltyStore.getConfig();

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAddCustomer = () => {
    if (newCustomer.name && newCustomer.phone) {
      const customer = store.addCustomer(newCustomer.name, newCustomer.phone, newCustomer.email || undefined);
      setCustomers(store.getCustomers());
      setNewCustomer({ name: '', phone: '', email: '' });
      setShowAddModal(false);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('Delete this customer?')) {
      store.deleteCustomer(id);
      setCustomers(store.getCustomers());
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Stats
  const totalCustomers = customers.length;
  const activeThisMonth = customers.filter(c => {
    if (!c.lastVisit) return false;
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return c.lastVisit > monthAgo;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Customers</h1>
              <p className="text-xs text-gray-500">Manage your customer database</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-[13px]">
              <div>
                <span className="text-gray-500">Total</span>
                <span className="ml-1.5 font-semibold text-gray-900">{totalCustomers}</span>
              </div>
              <div>
                <span className="text-gray-500">Active (30d)</span>
                <span className="ml-1.5 font-medium text-gray-700">{activeThisMonth}</span>
              </div>
            </div>
          </div>

          {/* Search & Add */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-[13px] mb-2">
              {searchTerm ? 'No customers found' : 'No customers yet'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {filteredCustomers.map((customer) => {
              const tierConfig = customer.loyalty ? getTierConfig(customer.loyalty.tier) : null;
              return (
                <div
                  key={customer.id}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-medium text-gray-600 relative">
                        {customer.name.charAt(0).toUpperCase()}
                        {tierConfig && (
                          <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">{tierConfig.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-900 text-[13px]">{customer.name}</span>
                          {tierConfig && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tierConfig.bg} ${tierConfig.text} capitalize`}>
                              {customer.loyalty?.tier}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">{customer.totalVisits || 0} visits</span>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                          <span>{customer.phone}</span>
                          {customer.loyalty && loyaltyConfig.enabled && (
                            <span className="flex items-center gap-0.5 text-slate-800">
                              <Star className="w-3 h-3" />
                              {customer.loyalty.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {customer.totalSpent !== undefined && customer.totalSpent > 0 && (
                        <span className="text-[11px] text-gray-500" dir="auto">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      )}
                      {customer.lastVisit && (
                        <span className="text-[11px] text-gray-400 hidden sm:inline">
                          {formatDate(customer.lastVisit)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(customer.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">Add Customer</h2>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="input"
                  placeholder="Customer name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="input"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="input"
                  placeholder="customer@example.com"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCustomer({ name: '', phone: '', email: '' });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomer.name || !newCustomer.phone}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header with tier badge */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-xl font-semibold text-gray-600 relative">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                  {selectedCustomer.loyalty && (
                    <span className="absolute -bottom-1 -right-1 text-lg">
                      {getTierConfig(selectedCustomer.loyalty.tier).icon}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                  <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Loyalty Section */}
              {loyaltyConfig.enabled && selectedCustomer.loyalty ? (
                <div className="space-y-4">
                  {/* Tier Banner */}
                  <div className={`p-4 rounded-lg ${getTierConfig(selectedCustomer.loyalty.tier).bg}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium ${getTierConfig(selectedCustomer.loyalty.tier).text} uppercase tracking-wider`}>
                          Membership Tier
                        </p>
                        <p className={`text-lg font-bold ${getTierConfig(selectedCustomer.loyalty.tier).text} capitalize`}>
                          {selectedCustomer.loyalty.tier}
                        </p>
                      </div>
                      <Award className={`w-10 h-10 ${getTierConfig(selectedCustomer.loyalty.tier).text} opacity-50`} />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {getTierBenefits(selectedCustomer.loyalty.tier).description}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-800 font-medium">Available Points</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedCustomer.loyalty.points}</p>
                      <p className="text-xs text-slate-800" dir="auto">
                        = {formatCurrency(loyaltyStore.getPointsValue(selectedCustomer.loyalty.points))}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                      <p className="text-xl font-bold text-gray-700">{selectedCustomer.loyalty.totalPointsEarned}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500 font-medium">Redeemed</p>
                      <p className="text-xl font-bold text-gray-700">{selectedCustomer.loyalty.totalPointsRedeemed}</p>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-gray-500">Member since</span>
                    <span className="font-medium text-gray-700">
                      {new Date(selectedCustomer.loyalty.memberSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : loyaltyConfig.enabled ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <Gift className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No loyalty account yet</p>
                  <p className="text-xs text-gray-400">Points will be added after their first purchase</p>
                </div>
              ) : null}

              {/* Customer Stats */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Visits</span>
                  <span className="font-medium text-gray-700">{selectedCustomer.totalVisits || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Spent</span>
                  <span className="font-medium text-gray-700" dir="auto">
                    {formatCurrency(selectedCustomer.totalSpent || 0)}
                  </span>
                </div>
                {selectedCustomer.lastVisit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Visit</span>
                    <span className="font-medium text-gray-700">{formatDate(selectedCustomer.lastVisit)}</span>
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-700">{selectedCustomer.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn-secondary w-full"
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
