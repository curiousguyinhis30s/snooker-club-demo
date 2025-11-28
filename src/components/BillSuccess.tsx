import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Printer, X, Download } from 'lucide-react';
import type { SalesTransaction } from '../types';
import { formatCurrencyCompact } from '../lib/currency';
import ReceiptTemplate from './ReceiptTemplate';
import { store } from '../lib/store';

interface BillSuccessProps {
  transaction: SalesTransaction;
  onClose: () => void;
}

export default function BillSuccess({ transaction, onClose }: BillSuccessProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const settings = store.getSettings();

  const handlePrint = () => {
    setIsPrinting(true);
    setShowReceipt(true);

    const afterPrintHandler = () => {
      setShowReceipt(false);
      setIsPrinting(false);
      window.removeEventListener('afterprint', afterPrintHandler);
    };

    window.addEventListener('afterprint', afterPrintHandler);

    setTimeout(() => {
      window.print();
    }, 300);

    // Fallback cleanup
    setTimeout(() => {
      if (showReceipt) {
        setShowReceipt(false);
        setIsPrinting(false);
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    }, 60000);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-5 py-6 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-once">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-0.5">Payment Successful</h2>
          <p className="text-white/80 text-xs">Transaction #{transaction.id.slice(-8)}</p>
        </div>

        {/* Transaction Details */}
        <div className="px-5 py-4 space-y-3">
          {/* Amount */}
          <div className="text-center py-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-0.5">Total Paid</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrencyCompact(transaction.total)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
              via {transaction.paymentMethod === 'split' ? 'Split Payment' : transaction.paymentMethod}
            </p>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-gray-500 text-[11px]">Customer</p>
              <p className="font-medium text-gray-900 text-[13px] truncate">{transaction.customerName}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-gray-500 text-[11px]">Table</p>
              <p className="font-medium text-gray-900 text-[13px]">{transaction.tableNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-gray-500 text-[11px]">Duration</p>
              <p className="font-medium text-gray-900 text-[13px]">{formatDuration(transaction.duration)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-gray-500 text-[11px]">Date</p>
              <p className="font-medium text-gray-900 text-[13px]">{new Date(transaction.date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="border-t pt-2.5 space-y-1 text-[13px]">
            <div className="flex justify-between text-gray-600">
              <span>Table Charge</span>
              <span>{formatCurrencyCompact(transaction.tableCharge)}</span>
            </div>
            {transaction.fnbTotal > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>F&B ({transaction.fnbItems.length} items)</span>
                <span>{formatCurrencyCompact(transaction.fnbTotal)}</span>
              </div>
            )}
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-slate-800">
                <span>Discount</span>
                <span>-{formatCurrencyCompact(transaction.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t">
              <span>Total</span>
              <span>{formatCurrencyCompact(transaction.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-700 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Printing...' : 'Print'}</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-neutral-950 text-white py-2.5 rounded-lg text-[13px] font-medium transition-colors"
          >
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* Hidden Receipt for Printing */}
      {showReceipt && createPortal(
        <div id="receipt-print-wrapper" style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <ReceiptTemplate
            transaction={transaction}
            tableNumber={transaction.tableNumber}
            clubName={settings.clubName}
            receiptNumber={transaction.id.slice(-8).toUpperCase()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
