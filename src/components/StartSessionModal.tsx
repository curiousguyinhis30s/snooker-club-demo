import { useState, useEffect } from 'react';
import { X, Search, UserPlus, User, Phone, Mail, Play } from 'lucide-react';
import { store } from '../lib/store';
import type { Customer } from '../types';

interface StartSessionModalProps {
  tableNumber: string;
  onClose: () => void;
  onStart: (name: string, phone?: string) => void;
}

export default function StartSessionModal({ tableNumber, onClose, onStart }: StartSessionModalProps) {
  const [mode, setMode] = useState<'select' | 'new'>('select');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setCustomers(store.getCustomers());
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleStartWithSelected = () => {
    if (selectedCustomer) {
      onStart(selectedCustomer.name, selectedCustomer.phone);
      onClose();
    }
  };

  const handleStartWithNew = () => {
    if (name.trim()) {
      // Add to customer database
      store.addCustomer(name.trim(), phone.trim() || '', email.trim() || undefined);
      // Start session
      onStart(name.trim(), phone.trim() || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:max-w-lg max-h-[80vh] md:max-h-[90vh] md:mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Start Session</h3>
              <p className="text-sm text-gray-500">{tableNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-md">
            <button
              onClick={() => setMode('select')}
              className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                mode === 'select'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Existing Customer
            </button>
            <button
              onClick={() => setMode('new')}
              className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                mode === 'new'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              New Customer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'select' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-12"
                  placeholder="Search by name or phone..."
                  autoFocus
                />
              </div>

              {/* Customer List */}
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? 'No customers found' : 'No customers yet'}
                    </p>
                    <button
                      onClick={() => setMode('new')}
                      className="mt-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                    >
                      + Add new customer
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Customer name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - with bottom nav + safe area padding on mobile */}
        <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50 pb-20 md:pb-4">
          <div className="flex gap-2 md:gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-2.5 md:py-2">
              Cancel
            </button>
            {mode === 'select' ? (
              <button
                onClick={handleStartWithSelected}
                disabled={!selectedCustomer}
                className="btn-primary flex-1 py-2.5 md:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Session
              </button>
            ) : (
              <button
                onClick={handleStartWithNew}
                disabled={!name.trim() || !phone.trim()}
                className="btn-primary flex-1 py-2.5 md:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add & Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
