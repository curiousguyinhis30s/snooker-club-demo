import { useState } from 'react';
import { X, Plus, Minus, ShoppingCart, Package, Coffee, UtensilsCrossed, Sandwich, Search } from 'lucide-react';
import type { MenuItem, Bundle } from '../types';
import { formatCurrencyCompact } from '../lib/currency';

interface FoodMenuModalProps {
  tableNumber: string;
  menuItems: MenuItem[];
  bundles?: Bundle[];
  onClose: () => void;
  onAddItem: (menuItemId: string, quantity: number) => void;
  onAddBundle?: (bundleId: string, quantity: number) => void;
}

export default function FoodMenuModal({ tableNumber, menuItems, bundles = [], onClose, onAddItem, onAddBundle }: FoodMenuModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bundles' | 'drinks' | 'snacks' | 'meals'>('all');
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [bundleCart, setBundleCart] = useState<Map<string, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', label: 'All Items', icon: UtensilsCrossed },
    { id: 'bundles', label: 'Bundles', icon: Package, count: bundles.filter(b => b.available).length },
    { id: 'drinks', label: 'Drinks', icon: Coffee },
    { id: 'snacks', label: 'Snacks', icon: Sandwich },
    { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
  ];

  const filteredItems = (selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory)
  ).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateQuantity = (itemId: string, change: number) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const current = newCart.get(itemId) || 0;
      const newQuantity = Math.max(0, current + change);

      if (newQuantity === 0) {
        newCart.delete(itemId);
      } else {
        newCart.set(itemId, newQuantity);
      }

      return newCart;
    });
  };

  const updateBundleQuantity = (bundleId: string, change: number) => {
    setBundleCart(prev => {
      const newCart = new Map(prev);
      const current = newCart.get(bundleId) || 0;
      const newQuantity = Math.max(0, current + change);

      if (newQuantity === 0) {
        newCart.delete(bundleId);
      } else {
        newCart.set(bundleId, newQuantity);
      }

      return newCart;
    });
  };

  const handleAddToSession = () => {
    cart.forEach((quantity, itemId) => {
      onAddItem(itemId, quantity);
    });
    bundleCart.forEach((quantity, bundleId) => {
      if (onAddBundle) {
        onAddBundle(bundleId, quantity);
      }
    });
    onClose();
  };

  const totalItems = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0) +
    Array.from(bundleCart.values()).reduce((sum, qty) => sum + qty, 0);

  // Calculate total price
  const totalPrice = Array.from(cart.entries()).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find(i => i.id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0) + Array.from(bundleCart.entries()).reduce((sum, [bundleId, qty]) => {
    const bundle = bundles.find(b => b.id === bundleId);
    return sum + (bundle ? bundle.bundlePrice * qty : 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
      <div className="bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:max-w-4xl max-h-[80vh] md:max-h-[90vh] md:mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Food & Beverage</h3>
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

        {/* Search & Category Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9"
              placeholder="Search..."
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1 overflow-x-auto">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                  {cat.count !== undefined && cat.count > 0 && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Bundles Section */}
          {(selectedCategory === 'all' || selectedCategory === 'bundles') && bundles.filter(b => b.available).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Bundles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bundles.filter(b => b.available).map((bundle) => {
                  const quantity = bundleCart.get(bundle.id) || 0;

                  return (
                    <div key={bundle.id} className="card p-4 border border-gray-200">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-xl">
                          {bundle.icon || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1">{bundle.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 line-through">{formatCurrencyCompact(bundle.originalPrice)}</span>
                          <span className="font-semibold text-gray-900">{formatCurrencyCompact(bundle.bundlePrice)}</span>
                        </div>
                        {quantity === 0 ? (
                          <button
                            onClick={() => updateBundleQuantity(bundle.id, 1)}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateBundleQuantity(bundle.id, -1)}
                              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-medium">{quantity}</span>
                            <button
                              onClick={() => updateBundleQuantity(bundle.id, 1)}
                              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Items */}
          {selectedCategory !== 'bundles' && (
            <>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const quantity = cart.get(item.id) || 0;

                    return (
                      <div key={item.id} className={`card p-3 ${
                        quantity > 0 ? 'border-slate-300 bg-slate-50' : ''
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                          </div>
                          <span className="font-semibold text-gray-900 ml-2">{formatCurrencyCompact(item.price)}</span>
                        </div>

                        <div className="flex items-center justify-end">
                          {quantity === 0 ? (
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="btn-primary text-xs px-3 py-1.5"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-medium">{quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - with bottom nav + safe area padding on mobile */}
        <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50 pb-20 md:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-shrink-0">
              {totalItems > 0 && (
                <div className="text-xs md:text-sm text-gray-600">
                  {totalItems} item{totalItems > 1 ? 's' : ''} · <span className="font-semibold text-gray-900">{formatCurrencyCompact(totalPrice)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 md:gap-3 flex-1 md:flex-none justify-end">
              <button onClick={onClose} className="btn-secondary py-2.5 md:py-2 px-3 md:px-4">
                Cancel
              </button>
              <button
                onClick={handleAddToSession}
                disabled={totalItems === 0}
                className="btn-primary py-2.5 md:py-2 px-3 md:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
