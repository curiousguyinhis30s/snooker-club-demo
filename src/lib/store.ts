import type { Table, Session, Settings, MenuItem, FoodItem, Activity } from '../types';
import { defaultActivities } from '../config/activities';
import { validatePositiveNumber, validateNonEmptyString, validateCustomer, sanitizeString, normalizePhoneNumber } from './validation';

const STORAGE_KEYS = {
  TABLES: 'snooker_tables',
  SETTINGS: 'snooker_settings',
};

const SETTINGS_VERSION = 2; // Increment to force migration

const defaultMenuItems: MenuItem[] = [
  { id: '1', name: 'Coca Cola', price: 2.5, category: 'drinks', available: true },
  { id: '2', name: 'Pepsi', price: 2.5, category: 'drinks', available: true },
  { id: '3', name: 'Water', price: 1.5, category: 'drinks', available: true },
  { id: '4', name: 'Coffee', price: 3.0, category: 'drinks', available: true },
  { id: '5', name: 'Tea', price: 2.0, category: 'drinks', available: true },
  { id: '6', name: 'Chips', price: 3.5, category: 'snacks', available: true },
  { id: '7', name: 'Sandwich', price: 5.0, category: 'snacks', available: true },
  { id: '8', name: 'Burger', price: 8.0, category: 'meals', available: true },
  { id: '9', name: 'Pizza Slice', price: 6.5, category: 'meals', available: true },
];

const defaultBundles: import('../types').Bundle[] = [
  {
    id: 'bundle-1',
    name: 'Game Night Special',
    description: '2 Burgers + 2 Drinks + Chips',
    items: [
      { menuItemId: '8', quantity: 2 }, // Burger
      { menuItemId: '1', quantity: 2 }, // Coca Cola
      { menuItemId: '6', quantity: 1 }, // Chips
    ],
    originalPrice: 21.5,
    bundlePrice: 18.0,
    discount: 16,
    available: true,
    icon: '🎮',
  },
  {
    id: 'bundle-2',
    name: 'Snack Pack',
    description: 'Chips + Sandwich + Drink',
    items: [
      { menuItemId: '6', quantity: 1 }, // Chips
      { menuItemId: '7', quantity: 1 }, // Sandwich
      { menuItemId: '2', quantity: 1 }, // Pepsi
    ],
    originalPrice: 11.0,
    bundlePrice: 9.0,
    discount: 18,
    available: true,
    icon: '🍿',
  },
];

const defaultCustomers: import('../types').Customer[] = [
  {
    id: 'customer-1',
    name: 'Ahmed Al-Saud',
    phone: '0501234567',
    email: 'ahmed.alsaud@email.com',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
    totalVisits: 15,
    lastVisit: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: 'customer-2',
    name: 'Mohammed bin Khalid',
    phone: '0507654321',
    email: 'mohammed.k@email.com',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45, // 45 days ago
    totalVisits: 23,
    lastVisit: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  },
  {
    id: 'customer-3',
    name: 'Sami Abdullah',
    phone: '0187879656',
    email: 'sami.abdullah@email.com',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60, // 60 days ago
    totalVisits: 8,
    lastVisit: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
  },
  {
    id: 'customer-4',
    name: 'Faisal Al-Rashid',
    phone: '0551122334',
    email: 'faisal.rashid@email.com',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20, // 20 days ago
    totalVisits: 12,
    lastVisit: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
  },
  {
    id: 'customer-5',
    name: 'Khalid Ibrahim',
    phone: '0503344556',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15, // 15 days ago
    totalVisits: 6,
    lastVisit: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
  },
  {
    id: 'customer-6',
    name: 'Omar Al-Zahrani',
    phone: '0559988776',
    email: 'omar.zahrani@email.com',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
    totalVisits: 4,
    lastVisit: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
  },
];

export const defaultSettings: Settings = {
  clubName: 'Snooker Club',
  numberOfTables: 6,
  hourlyRate: 10,
  currency: 'SAR',
  menuItems: defaultMenuItems,
  bundles: defaultBundles,
  customers: defaultCustomers,
  activities: defaultActivities,
};

export const store = {
  getTables(): Table[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TABLES);

      // Migration: Check if existing tables have activityId field
      if (stored) {
        const existingTables = JSON.parse(stored);
        const needsMigration = existingTables.length > 0 && !existingTables[0].activityId;

        if (!needsMigration) {
          return existingTables;
        }

        // Clear old tables to regenerate with activity-based structure
        localStorage.removeItem(STORAGE_KEYS.TABLES);
      }
    } catch (error) {
      console.error('Failed to load tables from localStorage:', error);
      // Clear corrupted data and regenerate
      localStorage.removeItem(STORAGE_KEYS.TABLES);
    }

    const settings = this.getSettings();
    const enabledActivities = settings.activities?.filter(a => a.enabled) || [];

    // Generate tables for each enabled activity
    const tables: Table[] = [];
    let tableId = 1;

    enabledActivities.forEach(activity => {
      for (let i = 0; i < activity.stationCount; i++) {
        tables.push({
          id: tableId++,
          number: `${activity.name} ${activity.stationType} ${i + 1}`,
          type: 'snooker' as const, // Default type
          size: 'medium' as const,
          hourlyRate: activity.defaultRate,
          status: 'available' as const,
          activityId: activity.id,
        });
      }
    });

    this.saveTables(tables);
    return tables;
  },

  saveTables(tables: Table[]) {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  },

  getSettings(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return defaultSettings;

      const settings = JSON.parse(stored);

    // Version-based migration
    const currentVersion = settings._version || 1;
    let needsUpdate = false;

    // Force migration if version changed
    if (currentVersion < SETTINGS_VERSION) {
      settings.activities = defaultActivities;
      settings._version = SETTINGS_VERSION;
      needsUpdate = true;
    } else {
      // Regular migration: Add or update activities
      if (!settings.activities) {
        settings.activities = defaultActivities;
        needsUpdate = true;
      } else {
        defaultActivities.forEach(defaultActivity => {
          const existingActivity = settings.activities.find((a: Activity) => a.id === defaultActivity.id);

          if (!existingActivity) {
            // Add new activity
            settings.activities.push(defaultActivity);
            needsUpdate = true;
          }
        });
      }
    }

    if (needsUpdate) {
      this.saveSettings(settings);
      // Force table regeneration
      localStorage.removeItem(STORAGE_KEYS.TABLES);
    }

      return settings;
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      // Clear corrupted data and return defaults
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return defaultSettings;
    }
  },

  saveSettings(settings: Settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    // Update data fingerprint when settings change
    this.updateDataFingerprint(settings);
  },

  updateDataFingerprint(settings: Settings) {
    // Track that custom data exists
    const hasCustomCustomers = (settings.customers?.length || 0) > 6;
    const hasTransactions = !!localStorage.getItem('snooker_sales_transactions');

    if (hasCustomCustomers || hasTransactions) {
      const fingerprint = `fp-settings-${settings.customers?.length || 0}-${Date.now()}`;
      localStorage.setItem('snooker_data_fingerprint', fingerprint);
    }
  },

  startSession(tableId: number, customerName: string, customerPhone?: string): Table[] {
    const tables = this.getTables();
    const table = tables.find(t => t.id === tableId);

    if (table && table.status === 'available') {
      table.status = 'occupied';
      table.session = {
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        tableId,
        customerName,
        customerPhone,
        startTime: Date.now(),
        pausedDuration: 0,
        foodItems: [],
        hourlyRate: table.hourlyRate, // Use table-specific rate
      };
      this.saveTables(tables);
    }

    return tables;
  },

  pauseSession(tableId: number): Table[] {
    const tables = this.getTables();
    const table = tables.find(t => t.id === tableId);

    if (table?.session && table.status === 'occupied') {
      table.status = 'paused';
      table.session.pausedAt = Date.now();
      this.saveTables(tables);
    }

    return tables;
  },

  resumeSession(tableId: number): Table[] {
    const tables = this.getTables();
    const table = tables.find(t => t.id === tableId);

    if (table?.session && table.status === 'paused' && table.session.pausedAt) {
      table.status = 'occupied';
      table.session.pausedDuration += Date.now() - table.session.pausedAt;
      table.session.pausedAt = undefined;
      this.saveTables(tables);
    }

    return tables;
  },

  endSession(tableId: number): { tables: Table[], session: Session | null } {
    const tables = this.getTables();
    const table = tables.find(t => t.id === tableId);
    const session = table?.session || null;

    if (table) {
      table.status = 'available';
      table.session = undefined;
      this.saveTables(tables);
    }

    return { tables, session };
  },

  addFoodItem(tableId: number, menuItemId: string, quantity: number = 1): Table[] {
    // VALIDATION: Check quantity is positive
    const quantityCheck = validatePositiveNumber(quantity, 'Quantity');
    if (!quantityCheck.valid) {
      throw new Error(quantityCheck.error);
    }

    const tables = this.getTables();
    const settings = this.getSettings();
    const table = tables.find(t => t.id === tableId);
    const menuItem = settings.menuItems.find(m => m.id === menuItemId);

    if (table?.session && menuItem) {
      // Check if this exact menu item already exists by menuItemId
      const existingItem = table.session.foodItems.find(f => f.menuItemId === menuItemId);

      if (existingItem) {
        // Merge with existing item by incrementing quantity
        existingItem.quantity += quantity;
      } else {
        // Create new food item with menuItemId tracking
        // Use timestamp + random string to ensure unique IDs even when adding items quickly
        const foodItem: FoodItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          menuItemId: menuItemId, // Store original menu item ID for merging
        };
        table.session.foodItems.push(foodItem);
      }

      this.saveTables(tables);
    }

    return tables;
  },

  removeFoodItem(tableId: number, itemId: string): Table[] {
    const tables = this.getTables();
    const table = tables.find(t => t.id === tableId);

    if (table?.session) {
      table.session.foodItems = table.session.foodItems.filter(item => item.id !== itemId);
      this.saveTables(tables);
    }

    return tables;
  },

  addBundle(tableId: number, bundleId: string, quantity: number = 1): Table[] {
    const tables = this.getTables();
    const settings = this.getSettings();
    const table = tables.find(t => t.id === tableId);
    const bundle = settings.bundles?.find(b => b.id === bundleId);

    if (table?.session && bundle) {
      // Check if this exact bundle already exists by bundleId
      const existingBundle = table.session.foodItems.find(f => f.bundleId === bundleId);

      if (existingBundle) {
        // Merge with existing bundle by incrementing quantity
        existingBundle.quantity += quantity;
      } else {
        // Create new bundle item
        const bundleItemNames = bundle.items
          .map(item => {
            const menuItem = settings.menuItems.find(m => m.id === item.menuItemId);
            return menuItem ? `${item.quantity}x ${menuItem.name}` : '';
          })
          .filter(Boolean);

        const foodItem: FoodItem = {
          id: `bundle-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: bundle.name,
          price: bundle.bundlePrice,
          quantity,
          isBundle: true,
          bundleItems: bundleItemNames,
          bundleId: bundleId, // Store original bundle ID for merging
        };

        table.session.foodItems.push(foodItem);
      }

      this.saveTables(tables);
    }

    return tables;
  },

  // Customer management methods
  getCustomers(): import('../types').Customer[] {
    const settings = this.getSettings();
    return settings.customers || [];
  },

  addCustomer(name: string, phone: string, email?: string): import('../types').Customer {
    // VALIDATION: Check customer data
    const validationResult = validateCustomer(name, phone, email);
    if (!validationResult.valid) {
      throw new Error(validationResult.error);
    }

    const settings = this.getSettings();

    // Sanitize and normalize data
    const sanitizedName = sanitizeString(name);
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check for duplicate phone numbers
    const existingCustomer = settings.customers?.find(c =>
      normalizePhoneNumber(c.phone) === normalizedPhone
    );
    if (existingCustomer) {
      throw new Error('Customer with this phone number already exists');
    }

    const customer: import('../types').Customer = {
      id: `customer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: sanitizedName,
      phone: normalizedPhone,
      email: email ? sanitizeString(email) : undefined,
      createdAt: Date.now(),
      totalVisits: 0,
      lastVisit: Date.now(),
    };

    const customers = [...(settings.customers || []), customer];
    this.saveSettings({ ...settings, customers });
    return customer;
  },

  updateCustomer(customerId: string, updates: Partial<import('../types').Customer>): void {
    const settings = this.getSettings();
    const customers = settings.customers?.map(c =>
      c.id === customerId ? { ...c, ...updates } : c
    ) || [];
    this.saveSettings({ ...settings, customers });
  },

  deleteCustomer(customerId: string): void {
    const settings = this.getSettings();
    const customers = settings.customers?.filter(c => c.id !== customerId) || [];
    this.saveSettings({ ...settings, customers });
  },

  findCustomerByPhone(phone: string): import('../types').Customer | undefined {
    const customers = this.getCustomers();
    return customers.find(c => c.phone === phone);
  },
};
