import { useState, useEffect } from 'react';
import { AlertTriangle, CloudDownload, Upload, X, Shield } from 'lucide-react';

// Storage key for data fingerprint
const DATA_FINGERPRINT_KEY = 'snooker_data_fingerprint';
const LAST_BACKUP_WARNING_KEY = 'snooker_last_backup_warning';
const WARNING_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

interface DataLossWarningProps {
  onRestoreFromBackup: () => void;
}

/**
 * Generates a fingerprint based on user data
 * Returns null if no custom data exists
 */
function generateDataFingerprint(): string | null {
  const authUsers = localStorage.getItem('auth_users');
  const settings = localStorage.getItem('snooker_settings');

  if (!authUsers && !settings) {
    return null;
  }

  try {
    const users = authUsers ? JSON.parse(authUsers) : [];
    const settingsData = settings ? JSON.parse(settings) : {};

    // Check if there's any custom data (not just defaults)
    const hasCustomUsers = users.length > 1; // More than just superadmin
    const hasOwner = users.some((u: any) => u.role === 'owner');
    const hasCustomCustomers = (settingsData.customers?.length || 0) > 6; // More than default 6
    const hasTransactions = !!localStorage.getItem('snooker_sales_transactions');

    if (hasOwner || hasCustomUsers || hasCustomCustomers || hasTransactions) {
      // Generate fingerprint from data counts
      return `fp-${users.length}-${settingsData.customers?.length || 0}-${Date.now()}`;
    }
  } catch (e) {
    console.error('[DataLossWarning] Error generating fingerprint:', e);
  }

  return null;
}

/**
 * Checks if data loss has likely occurred
 */
function checkForDataLoss(): { hasDataLoss: boolean; hadData: boolean } {
  const savedFingerprint = localStorage.getItem(DATA_FINGERPRINT_KEY);

  if (!savedFingerprint) {
    // No fingerprint = never had custom data or first visit
    return { hasDataLoss: false, hadData: false };
  }

  // Had data before, check if it's still there
  const authUsers = localStorage.getItem('auth_users');
  const users = authUsers ? JSON.parse(authUsers) : [];

  // If fingerprint exists but no owner account, data was likely lost
  const hasOwner = users.some((u: any) => u.role === 'owner');

  if (!hasOwner) {
    return { hasDataLoss: true, hadData: true };
  }

  return { hasDataLoss: false, hadData: true };
}

/**
 * Saves the current data fingerprint
 */
export function saveDataFingerprint(): void {
  const fingerprint = generateDataFingerprint();
  if (fingerprint) {
    localStorage.setItem(DATA_FINGERPRINT_KEY, fingerprint);
  }
}

/**
 * Checks if backup reminder should be shown (every 3 days)
 */
function shouldShowBackupReminder(): boolean {
  const lastBackupDate = localStorage.getItem('last_backup_date');
  const lastWarning = localStorage.getItem(LAST_BACKUP_WARNING_KEY);

  // Don't show if backup was done recently
  if (lastBackupDate) {
    const daysSinceBackup = (Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBackup < 3) {
      return false;
    }
  }

  // Don't show warning too frequently
  if (lastWarning) {
    const timeSinceWarning = Date.now() - parseInt(lastWarning, 10);
    if (timeSinceWarning < WARNING_INTERVAL) {
      return false;
    }
  }

  // Only show if there's actual data to backup
  const fingerprint = generateDataFingerprint();
  return fingerprint !== null;
}

export default function DataLossWarning({ onRestoreFromBackup }: DataLossWarningProps) {
  const [showDataLossModal, setShowDataLossModal] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [dataLossInfo, setDataLossInfo] = useState<{ hasDataLoss: boolean; hadData: boolean }>({ hasDataLoss: false, hadData: false });

  useEffect(() => {
    // Check for data loss on mount
    const lossCheck = checkForDataLoss();
    setDataLossInfo(lossCheck);

    if (lossCheck.hasDataLoss) {
      setShowDataLossModal(true);
    } else if (shouldShowBackupReminder()) {
      // Show backup reminder if no data loss but it's been a while
      setShowBackupReminder(true);
    }

    // Save fingerprint if data exists
    saveDataFingerprint();
  }, []);

  const handleDismissDataLoss = () => {
    setShowDataLossModal(false);
    // Clear the old fingerprint since user acknowledges loss
    localStorage.removeItem(DATA_FINGERPRINT_KEY);
  };

  const handleDismissReminder = () => {
    setShowBackupReminder(false);
    localStorage.setItem(LAST_BACKUP_WARNING_KEY, Date.now().toString());
  };

  const handleRestoreClick = () => {
    setShowDataLossModal(false);
    setShowBackupReminder(false);
    onRestoreFromBackup();
  };

  // Data Loss Warning Modal
  if (showDataLossModal && dataLossInfo.hasDataLoss) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Data May Be Lost</h2>
                <p className="text-sm text-gray-500">Your browser cleared app data</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>What happened:</strong> Your browser or device cleared the app's stored data.
                This can happen due to:
              </p>
              <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                <li>Clearing browser cache/cookies</li>
                <li>Safari privacy settings (ITP)</li>
                <li>Low device storage</li>
                <li>Using a different browser/device</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-800">
                <strong>How to recover:</strong> If you have a backup file or Google Drive backup,
                you can restore your data now.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRestoreClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                <CloudDownload className="w-4 h-4" />
                Restore Backup
              </button>
              <button
                onClick={handleDismissDataLoss}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Backup Reminder Banner
  if (showBackupReminder) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Protect your data!</p>
              <p className="text-xs text-amber-100">Back up now to prevent data loss</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreClick}
              className="px-3 py-1.5 bg-white text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Backup Now
            </button>
            <button
              onClick={handleDismissReminder}
              className="p-1.5 text-amber-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
