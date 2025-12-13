import type { User, AuthState } from '../types';
import bcrypt from 'bcryptjs';

// DEPRECATED: Old weak hash function - kept for migration only
function hashPinLegacy(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// SECURE: Hash PIN using bcrypt (salt rounds: 10)
export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, 10);
}

// SECURE: Verify PIN against bcrypt hash
export function verifyPin(pin: string, hash: string): boolean {
  // Check if hash is legacy format (16 hex chars)
  if (hash.length <= 16 && /^[0-9a-f]+$/i.test(hash)) {
    // Legacy hash - compare using old method
    return hash === hashPinLegacy(pin);
  }
  // Modern bcrypt hash
  return bcrypt.compareSync(pin, hash);
}

// Migrate user's PIN from legacy hash to bcrypt
function migratePinToSecure(user: User, pin: string): void {
  user.pin = hashPin(pin);
  // Mark as migrated
  (user as any).pinMigrated = true;
}

// Storage keys
const USERS_KEY = 'auth_users';
const CURRENT_USER_KEY = 'auth_current_user';
const LAST_ACTIVITY_KEY = 'auth_last_activity';

// Session timeout: 2 hours of inactivity (in milliseconds)
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

// Generate a secure random PIN (6 digits)
function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Generate 6-digit PIN between 100000 and 999999
  return String(100000 + (array[0] % 900000));
}

// Default SuperAdmin PIN - ALWAYS 999999 (fixed, never changes)
const SUPERADMIN_DEFAULT_PIN = '999999';

// Simple function - always returns 999999
function getSuperAdminPinHash(): string {
  return hashPin(SUPERADMIN_DEFAULT_PIN);
}

// Default SuperAdmin credentials - PIN is ALWAYS 999999
function createDefaultSuperAdmin() {
  return {
    id: 'superadmin-001',
    role: 'superadmin' as const,
    name: 'SuperAdmin',
    username: 'superadmin',
    pin: getSuperAdminPinHash(),
    createdAt: Date.now(),
    active: true,
  };
}

// Get all users (without auto-init to avoid circular dependency)
function getUsersRaw(): User[] {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) return [];
  try {
    return JSON.parse(users);
  } catch (e) {
    console.error('[Auth] Failed to parse users from localStorage:', e);
    return [];
  }
}

// Initialize SuperAdmin if not exists
function initializeSuperAdmin() {
  const users = getUsersRaw();
  const hasSuperAdmin = users.some(u => u.role === 'superadmin');

  if (!hasSuperAdmin) {
    users.push(createDefaultSuperAdmin());
    saveUsers(users);
  }
}

// Export function to get SuperAdmin PIN - ALWAYS returns 999999
export function getSuperAdminInitialPin(): string {
  return '999999';
}

// No-op - PIN is hardcoded, nothing to clear
export function clearSuperAdminInitialPin(): void {
  // Nothing to do - PIN is always 999999
}

// Get all users
export function getAllUsers(): User[] {
  const users = getUsersRaw();

  // Ensure SuperAdmin exists on first call
  if (users.length === 0 || !users.some((u: User) => u.role === 'superadmin')) {
    initializeSuperAdmin();
    return getUsersRaw();
  }

  return users;
}

// Save all users
function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Update data fingerprint when users change
  updateDataFingerprint();
}

// Update data fingerprint to track that custom data exists
function updateDataFingerprint(): void {
  const users = getUsersRaw();
  const hasOwner = users.some((u: User) => u.role === 'owner');
  const hasEmployees = users.some((u: User) => u.role === 'employee');

  if (hasOwner || hasEmployees) {
    const fingerprint = `fp-${users.length}-${Date.now()}`;
    localStorage.setItem('snooker_data_fingerprint', fingerprint);
  }
}

// Update last activity timestamp
function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

// Check if session has timed out
function isSessionExpired(): boolean {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) {
    // Security: No activity recorded means session should be considered expired
    // This prevents indefinite sessions if activity tracking fails
    return true;
  }

  const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
  return timeSinceLastActivity > SESSION_TIMEOUT;
}

// Get current user with session timeout check
export function getCurrentUser(): User | null {
  const user = localStorage.getItem(CURRENT_USER_KEY);

  if (!user) {
    return null;
  }

  // Check if session has expired
  if (isSessionExpired()) {
    console.log('[Security] Session expired due to inactivity. Auto-logout.');
    logout();
    return null;
  }

  // Update activity on every access
  updateLastActivity();

  try {
    return JSON.parse(user);
  } catch (e) {
    console.error('[Auth] Failed to parse current user from localStorage:', e);
    logout();
    return null;
  }
}

// Save current user and initialize session tracking
function saveCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    updateLastActivity(); // Start tracking activity
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY); // Clear activity tracking
  }
}

// Check if owner exists
export function hasOwner(): boolean {
  const users = getAllUsers();
  return users.some(u => u.role === 'owner');
}

// Create owner account (by SuperAdmin)
export function createOwner(name: string, username: string, pin: string, createdBy?: string): User {
  const users = getAllUsers();

  // Check if username already exists
  if (users.some(u => u.username === username)) {
    throw new Error('Username already exists');
  }

  const owner: User = {
    id: `owner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    role: 'owner',
    name,
    username,
    pin: hashPin(pin),
    createdAt: Date.now(),
    active: true,
    createdBy: createdBy || 'superadmin-001',
  };

  users.push(owner);
  saveUsers(users);

  // If no createdBy specified, auto-login (first-time setup)
  if (!createdBy) {
    saveCurrentUser(owner);
  }

  return owner;
}

// Create employee account (by Owner)
export function createEmployee(name: string, employeeId: string, pin: string, createdBy: string): User {
  const users = getAllUsers();

  // Check if employee ID already exists
  if (users.some(u => u.employeeId === employeeId)) {
    throw new Error('Employee ID already exists');
  }

  const employee: User = {
    id: `employee-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    role: 'employee',
    name,
    username: employeeId,
    employeeId,
    pin: hashPin(pin),
    createdAt: Date.now(),
    active: true,
    createdBy,
  };

  users.push(employee);
  saveUsers(users);

  return employee;
}

// Login user with secure PIN verification and auto-migration
export function login(username: string, pin: string, role: 'superadmin' | 'owner' | 'employee'): User | null {
  const users = getAllUsers();

  // Find user by username/role
  const user = users.find(u => {
    if (role === 'superadmin') {
      return u.role === 'superadmin' && u.username === username && u.active;
    } else if (role === 'owner') {
      return u.role === 'owner' && u.username === username && u.active;
    } else {
      return u.role === 'employee' && u.employeeId === username && u.active;
    }
  });

  if (!user) {
    return null;
  }

  // Verify PIN using secure comparison
  if (!verifyPin(pin, user.pin)) {
    return null;
  }

  // Auto-migrate legacy PIN to bcrypt on successful login
  if (user.pin.length <= 16 && /^[0-9a-f]+$/i.test(user.pin)) {
    console.log(`[Security] Auto-migrating PIN for user ${user.username} to bcrypt`);
    migratePinToSecure(user, pin);
  }

  // Update last login
  user.lastLogin = Date.now();
  saveUsers(users);
  saveCurrentUser(user);

  return user;
}

// Logout and clear session data
export function logout(): void {
  saveCurrentUser(null);
}

// Get remaining session time in milliseconds
export function getSessionTimeRemaining(): number {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) {
    // No activity recorded means no active session
    return 0;
  }

  const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
  const remaining = SESSION_TIMEOUT - timeSinceLastActivity;

  return Math.max(0, remaining);
}

// Get session timeout duration (for display purposes)
export function getSessionTimeout(): number {
  return SESSION_TIMEOUT;
}

// Get auth state
export function getAuthState(): AuthState {
  const currentUser = getCurrentUser();
  return {
    currentUser,
    isAuthenticated: currentUser !== null,
  };
}

// Update employee status
export function updateEmployeeStatus(employeeId: string, active: boolean): boolean {
  const users = getAllUsers();
  const employee = users.find(u => u.employeeId === employeeId);

  if (employee && employee.role === 'employee') {
    employee.active = active;
    saveUsers(users);
    return true;
  }

  return false;
}

// Delete employee
export function deleteEmployee(employeeId: string): boolean {
  const users = getAllUsers();
  const index = users.findIndex(u => u.employeeId === employeeId);

  if (index !== -1 && users[index].role === 'employee') {
    users.splice(index, 1);
    saveUsers(users);
    return true;
  }

  return false;
}

// Delete owner (SuperAdmin only)
export function deleteOwner(userId: string): boolean {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId && u.role === 'owner');

  if (index !== -1) {
    users.splice(index, 1);
    saveUsers(users);
    return true;
  }

  return false;
}

// Update owner status (SuperAdmin only)
export function updateOwnerStatus(userId: string, active: boolean): boolean {
  const users = getAllUsers();
  const owner = users.find(u => u.id === userId && u.role === 'owner');

  if (owner) {
    owner.active = active;
    saveUsers(users);
    return true;
  }

  return false;
}

// Get all employees
export function getEmployees(): User[] {
  return getAllUsers().filter(u => u.role === 'employee');
}

// Get all owners (for SuperAdmin)
export function getOwners(): User[] {
  return getAllUsers().filter(u => u.role === 'owner');
}

// Get users created by current user
export function getUsersCreatedBy(creatorId: string): User[] {
  return getAllUsers().filter(u => u.createdBy === creatorId);
}

// Reset employee PIN (by Owner or SuperAdmin)
export function resetEmployeePin(employeeId: string, newPin: string): boolean {
  if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const users = getAllUsers();
  const employee = users.find(u => u.employeeId === employeeId && u.role === 'employee');

  if (!employee) {
    throw new Error('Employee not found');
  }

  employee.pin = hashPin(newPin);
  saveUsers(users);
  return true;
}

// Reset owner PIN (by SuperAdmin only)
export function resetOwnerPin(userId: string, newPin: string): boolean {
  if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const users = getAllUsers();
  const owner = users.find(u => u.id === userId && u.role === 'owner');

  if (!owner) {
    throw new Error('Owner not found');
  }

  owner.pin = hashPin(newPin);
  saveUsers(users);
  return true;
}
