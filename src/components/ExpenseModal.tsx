import { useState } from 'react';
import { X, Banknote, CreditCard, Receipt, Calendar, FileText, DollarSign } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../types';
import { formatCurrencyCompact } from '../lib/currency';
import { expenseStore } from '../lib/expenseStore';
import { getCurrentUser } from '../lib/auth';

interface ExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'supplies', label: 'Supplies', icon: '📦' },
  { value: 'food-stock', label: 'Food Stock', icon: '🍔' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'salaries', label: 'Salaries', icon: '💰' },
  { value: 'rent', label: 'Rent', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '📝' },
];

export default function ExpenseModal({ onClose, onSuccess }: ExpenseModalProps) {
  const currentUser = getCurrentUser();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('You must be logged in to add expenses');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      alert('Please provide a description');
      return;
    }

    setIsProcessing(true);

    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date,
      category,
      amount: amountNum,
      description: description.trim(),
      billNumber: billNumber.trim() || undefined,
      paymentMethod,
      addedBy: currentUser.name,
      addedByRole: currentUser.role,
      createdAt: Date.now(),
      locked: false,
    };

    expenseStore.addExpense(expense);

    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[100] flex items-center space-x-3 animate-slide-in';
    notification.innerHTML = `
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <div>
        <p class="font-bold">Expense Added!</p>
        <p class="text-sm">${formatCurrencyCompact(amountNum)} - ${EXPENSE_CATEGORIES.find(c => c.value === category)?.label}</p>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slide-out 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:max-w-xl max-h-[80vh] md:max-h-[90vh] md:mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add Expense</h3>
              <p className="text-sm text-gray-500">Record a business expense</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Date & Amount Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="input"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-2 rounded-md border text-center transition-colors ${
                    category === cat.value
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg">{cat.icon}</div>
                  <div className="text-xs text-gray-600">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              rows={2}
              className="input resize-none"
              required
            />
          </div>

          {/* Bill Number (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bill Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g., INV-12345"
              className="input"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-md border transition-colors flex items-center gap-2 ${
                  paymentMethod === 'cash'
                    ? 'border-slate-400 bg-slate-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-md border transition-colors flex items-center gap-2 ${
                  paymentMethod === 'card'
                    ? 'border-slate-400 bg-slate-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Card</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer - with bottom nav + safe area padding on mobile */}
        <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50 pb-20 md:pb-4">
          <div className="flex gap-2 md:gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 md:py-2">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn-primary flex-1 py-2.5 md:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
