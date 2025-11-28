import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Percent, DollarSign, Banknote, CreditCard, Smartphone, Clock, Coffee } from 'lucide-react';
import type { Session, UserRole, SalesTransaction } from '../types';
import { formatCurrencyCompact, formatRate } from '../lib/currency';
import { financeStore } from '../lib/financeStore';
import { getCurrentUser } from '../lib/auth';
import { store } from '../lib/store';
import ReceiptTemplate from './ReceiptTemplate';
import BillSuccess from './BillSuccess';
import SnookerBallIcon from './icons/SnookerBallIcon';
import { addMoney, subtractMoney, multiplyMoney, percentageOf, sumMoney, roundMoney, moneyEquals } from '../lib/moneyUtils';
import { validatePercentage, validateDiscountAmount, validateNonNegativeNumber } from '../lib/validation';

interface BillingModalProps {
  session: Session;
  tableNumber: string;
  onClose: () => void;
  onConfirm: () => void;
  userRole?: UserRole;
}

export default function BillingModal({ session, tableNumber, onClose, onConfirm, userRole = 'employee' }: BillingModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [discountReason, setDiscountReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [completedTransaction, setCompletedTransaction] = useState<SalesTransaction | null>(null);

  // Split payment state - Round to 2 decimal places
  const roundToTwo = (num: number) => Math.round(num * 100) / 100;
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);

  const currentUser = getCurrentUser();
  const settings = store.getSettings();

  // FEATURE: 5-minute grace period (300,000 ms)
  const GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

  // FIX: Calculate charges ONCE using useMemo with PRECISE money calculations
  // Uses integer cents to avoid floating-point rounding errors
  const billingData = useMemo(() => {
    const endTime = Date.now(); // Capture end time once
    let duration = endTime - session.startTime - session.pausedDuration;

    // Apply grace period: subtract first 5 minutes from billable time
    const billableDuration = Math.max(0, duration - GRACE_PERIOD);

    const hours = billableDuration / (1000 * 60 * 60);

    // PRECISION FIX: Use multiplyMoney for rate calculation
    const tableCharge = roundMoney(multiplyMoney(session.hourlyRate, hours));

    // PRECISION FIX: Use sumMoney for food items
    const foodCharges = session.foodItems.map(item => multiplyMoney(item.price, item.quantity));
    const foodCharge = roundMoney(sumMoney(foodCharges));

    // PRECISION FIX: Use addMoney for subtotal
    const subtotal = roundMoney(addMoney(tableCharge, foodCharge));

    return {
      endTime,
      duration, // actual duration
      billableDuration, // duration after grace period
      hours,
      tableCharge,
      foodCharge,
      subtotal,
      graceApplied: duration > GRACE_PERIOD
    };
  }, [session.startTime, session.pausedDuration, session.hourlyRate, session.foodItems]);

  // PRECISION FIX: Calculate discount with precise percentage calculation
  const discountAmount = roundMoney(
    discountType === 'percentage'
      ? percentageOf(billingData.subtotal, discountValue)
      : discountValue
  );

  // PRECISION FIX: Use subtractMoney for final total
  const totalAmount = Math.max(0, roundMoney(subtractMoney(billingData.subtotal, discountAmount)));

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Create transaction object for receipt
  const createTransaction = (): SalesTransaction => {
    return {
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sessionId: session.id,
      date: new Date().toISOString().split('T')[0],
      tableNumber,
      activityName: tableNumber.split(' ')[0],
      startTime: session.startTime,
      endTime: billingData.endTime,
      duration: Math.floor(billingData.duration / (1000 * 60)),
      tableCharge: billingData.tableCharge,
      fnbItems: session.foodItems,
      fnbTotal: billingData.foodCharge,
      subtotal: billingData.subtotal,
      discountAmount,
      discountReason: discountReason || 'No discount',
      discountApprovedBy: discountAmount > 0 ? (currentUser?.name || 'Unknown') : '',
      total: totalAmount,
      paymentMethod: paymentMethod === 'split' ? 'cash' : paymentMethod,
      startedBy: currentUser?.name || 'Unknown',
      endedBy: currentUser?.name || 'Unknown',
      endedUsing: 'owner',
      createdAt: Date.now(),
      locked: true,
      ...(paymentMethod === 'split' && {
        splitPayment: {
          cash: cashAmount,
          card: cardAmount
        }
      })
    };
  };

  const handlePrint = () => {
    // Show receipt
    setShowReceipt(true);

    // Set up print event listeners
    const afterPrintHandler = () => {
      setShowReceipt(false);
      window.removeEventListener('afterprint', afterPrintHandler);
    };

    window.addEventListener('afterprint', afterPrintHandler);

    // Delay to ensure receipt is fully rendered in DOM before printing
    setTimeout(() => {
      window.print();
    }, 300);

    // Fallback cleanup in case afterprint doesn't fire (rare edge case)
    const fallbackTimer = setTimeout(() => {
      if (showReceipt) {
        setShowReceipt(false);
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    }, 60000); // 60 seconds fallback

    // Cleanup on unmount
    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', afterPrintHandler);
    };
  };

  const handleConfirmPayment = async () => {
    // Clear previous validation errors
    setValidationError('');

    // VALIDATION: Check discount values
    if (discountType === 'percentage') {
      const percentCheck = validatePercentage(discountValue);
      if (!percentCheck.valid) {
        setValidationError(percentCheck.error || 'Invalid discount percentage');
        return;
      }
    } else {
      const discountCheck = validateDiscountAmount(discountValue, billingData.subtotal);
      if (!discountCheck.valid) {
        setValidationError(discountCheck.error || 'Invalid discount amount');
        return;
      }
    }

    // Validate discount reason if discount applied
    if (discountAmount > 0 && !discountReason.trim()) {
      setValidationError('Please provide a reason for the discount');
      return;
    }

    // PRECISION FIX: Validate split payment amounts using precise money calculations
    if (paymentMethod === 'split') {
      const splitTotal = roundMoney(addMoney(cashAmount, cardAmount));

      // Use moneyEquals with 1 cent tolerance
      if (!moneyEquals(splitTotal, totalAmount, 0.01)) {
        setValidationError(`Split payment amounts must equal total: ${formatCurrencyCompact(totalAmount)}. Current: ${formatCurrencyCompact(splitTotal)}`);
        return;
      }

      if (cashAmount <= 0 || cardAmount <= 0) {
        setValidationError('Both cash and card amounts must be greater than zero for split payment');
        return;
      }
    }

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Save sales transaction - using billingData to ensure consistent values
    const transaction: SalesTransaction = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sessionId: session.id,
      date: new Date().toISOString().split('T')[0],
      tableNumber,
      activityName: tableNumber.split(' ')[0], // Extract activity name from table number
      startTime: session.startTime,
      endTime: billingData.endTime, // Use captured end time
      duration: Math.floor(billingData.duration / (1000 * 60)), // in minutes (actual duration)
      tableCharge: billingData.tableCharge,
      fnbItems: session.foodItems,
      fnbTotal: billingData.foodCharge,
      subtotal: billingData.subtotal,
      discountAmount,
      discountReason: discountReason || 'No discount',
      discountApprovedBy: discountAmount > 0 ? (currentUser?.name || 'Unknown') : '',
      total: totalAmount,
      paymentMethod: paymentMethod,
      startedBy: currentUser?.name || 'Unknown',
      endedBy: currentUser?.name || 'Unknown',
      endedUsing: 'owner', // Simplified - all are owner for now
      createdAt: Date.now(),
      locked: true,
      // Customer info
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      // Add split payment details if applicable
      ...(paymentMethod === 'split' && {
        splitPayment: {
          cash: cashAmount,
          card: cardAmount
        }
      })
    };

    financeStore.saveSalesTransaction(transaction);

    // Show success screen with the completed transaction FIRST
    // Don't call onConfirm yet - wait until user closes success screen
    setCompletedTransaction(transaction);
    setIsProcessing(false);
  };

  // Handle closing from success screen - NOW call onConfirm to end session
  const handleSuccessClose = () => {
    onConfirm(); // End the session in parent
    setCompletedTransaction(null);
    onClose();
  };

  // Show success screen if transaction completed
  if (completedTransaction) {
    return (
      <BillSuccess
        transaction={completedTransaction}
        onClose={handleSuccessClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] animate-fade-in">
      <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-3xl max-h-[85vh] md:max-h-[85vh] md:mx-4 flex flex-col animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-4 lg:px-5 py-3 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-7 h-7 lg:w-8 lg:h-8 bg-slate-900 rounded-lg flex items-center justify-center p-1.5">
                <SnookerBallIcon className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-sm lg:text-[15px] font-semibold text-white">Session Bill</h3>
                <p className="text-slate-400 text-[11px] lg:text-xs">{tableNumber} • {session.customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Main Content - Single column on mobile, 2 columns on tablet+ */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column - Bill Details */}
          <div className="flex-1 p-3 md:p-4 overflow-y-auto md:border-r border-gray-100">
            {/* Session Info */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg mb-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-[11px] text-slate-500">Duration</p>
                  <p className="font-semibold text-slate-800 text-[13px]">{formatDuration(billingData.duration)}</p>
                </div>
              </div>
              {billingData.graceApplied && (
                <div className="text-right">
                  <p className="text-[11px] text-slate-800">Grace: -5 min</p>
                  <p className="font-semibold text-slate-800 text-[13px]">{formatDuration(billingData.billableDuration)}</p>
                </div>
              )}
            </div>

            {/* Table Charges */}
            <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-lg mb-2.5">
              <div>
                <p className="font-medium text-slate-800 text-[13px]">Table Charges</p>
                <p className="text-[11px] text-slate-500">{billingData.hours.toFixed(2)}h @ {formatRate(session.hourlyRate)}</p>
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">{formatCurrencyCompact(billingData.tableCharge)}</span>
            </div>

            {/* Food & Beverage */}
            {session.foodItems.length > 0 && (
              <div className="p-2.5 bg-white border border-gray-100 rounded-lg mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-800 text-[13px]">Food & Beverage</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-[13px]">{formatCurrencyCompact(billingData.foodCharge)}</span>
                </div>
                <div className="space-y-0.5 pt-1.5 border-t border-gray-100">
                  {session.foodItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className="text-slate-600">{item.quantity}x {item.name}</span>
                      <span className="text-slate-700">{formatCurrencyCompact(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discount Section - Only for Owner and SuperAdmin */}
            {(userRole === 'owner' || userRole === 'superadmin') && (
              <div className="p-2.5 bg-white border border-gray-100 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <Percent className="w-3.5 h-3.5 text-slate-800" />
                  <span className="font-medium text-slate-800 text-[13px]">Discount</span>
                </div>

                {/* Discount Type Toggle */}
                <div className="flex gap-1 p-0.5 bg-slate-100 rounded-md mb-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                      discountType === 'percentage' ? 'bg-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    % Percentage
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                      discountType === 'fixed' ? 'bg-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    $ Fixed
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : billingData.subtotal}
                    step={discountType === 'percentage' ? 1 : 0.5}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800"
                    placeholder="Enter discount"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]">
                    {discountType === 'percentage' ? '%' : 'SAR'}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <>
                    <p className="text-[13px] text-slate-800 font-medium mt-1.5">-{formatCurrencyCompact(discountAmount)}</p>
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Reason (required)"
                      className="w-full mt-1.5 px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:ring-1 focus:ring-slate-800/20 focus:border-slate-800"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Payment */}
          <div className="w-full md:w-72 p-3 md:p-4 bg-slate-50 flex flex-col flex-shrink-0 border-t md:border-t-0 border-gray-200">
            {/* Payment Method */}
            <div className="mb-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase mb-1.5">Payment Method</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => { setPaymentMethod('cash'); setCashAmount(0); setCardAmount(0); }}
                  className={`py-2 rounded-lg border-2 transition-all flex flex-col items-center ${
                    paymentMethod === 'cash'
                      ? 'border-slate-800 bg-slate-50 text-slate-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Cash</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('card'); setCashAmount(0); setCardAmount(0); }}
                  className={`py-2 rounded-lg border-2 transition-all flex flex-col items-center ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Card</span>
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('split');
                    const half = roundToTwo(totalAmount / 2);
                    setCashAmount(half);
                    setCardAmount(roundToTwo(totalAmount - half));
                  }}
                  className={`py-2 rounded-lg border-2 transition-all flex flex-col items-center ${
                    paymentMethod === 'split'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Split</span>
                </button>
              </div>
            </div>

            {/* Split Payment Inputs */}
            {paymentMethod === 'split' && (
              <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 mb-3">
                <div className="space-y-1.5">
                  <div>
                    <label className="text-[11px] text-purple-700 font-medium">Cash</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={roundToTwo(cashAmount)}
                      onChange={(e) => {
                        const cash = roundToTwo(parseFloat(e.target.value) || 0);
                        setCashAmount(cash);
                        setCardAmount(roundToTwo(totalAmount - cash));
                      }}
                      className="w-full px-2.5 py-1.5 text-[13px] border border-purple-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-purple-700 font-medium">Card</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={roundToTwo(cardAmount)}
                      onChange={(e) => {
                        const card = roundToTwo(parseFloat(e.target.value) || 0);
                        setCardAmount(card);
                        setCashAmount(roundToTwo(totalAmount - card));
                      }}
                      className="w-full px-2.5 py-1.5 text-[13px] border border-purple-200 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bill Summary */}
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase mb-1.5">Summary</p>
              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">{formatCurrencyCompact(billingData.subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-800">Discount</span>
                    <span className="text-slate-800">-{formatCurrencyCompact(discountAmount)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 text-[13px]">Total</span>
                    <span className="text-xl font-bold text-slate-900">{formatCurrencyCompact(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[11px] text-red-700">{validationError}</p>
              </div>
            )}

            {/* Confirm Button - with bottom nav + safe area padding on mobile */}
            <div className="mt-3 pb-20 md:pb-0">
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className={`w-full py-3 md:py-2.5 rounded-lg text-sm md:text-[13px] font-medium text-white transition-all flex items-center justify-center gap-2 ${
                  isProcessing
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-neutral-950 shadow-md shadow-slate-900/20 active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Payment</span>
                    <span className="font-semibold">{formatCurrencyCompact(totalAmount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Template - Rendered via Portal to document.body for print */}
      {showReceipt && createPortal(
        <div id="receipt-print-wrapper" style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <ReceiptTemplate
            session={session}
            transaction={createTransaction()}
            tableNumber={tableNumber}
            clubName={settings.clubName}
            clubAddress="Sample Address, City" // Can be added to settings later
            clubPhone="+966 XXX XXX XXX" // Can be added to settings later
            receiptNumber={`RCP-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
