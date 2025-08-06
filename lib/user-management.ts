import { v4 as uuidv4 } from 'uuid';
import { User } from './types';
import { hashPassword, verifyPassword, generateTokens, createPasswordResetToken, AuthTokens } from './auth';
import { auditLog, AuditAction } from './audit';

// Enhanced User interface with security fields
export interface SecureUser extends User {
  passwordHash: string;
  refreshTokens: string[];
  lastLogin?: string;
  loginAttempts: number;
  lockedUntil?: string;
  mfaSecret?: string;
  mfaEnabled: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  sessionId?: string;
  createdBy?: string;
  updatedBy?: string;
  isActive: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: User['role'];
  firstName?: string;
  lastName?: string;
  createdBy: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: User['role'];
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  updatedBy: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
  requiresMFA?: boolean;
  lockedUntil?: string;
}

// In-memory user store (replace with database in production)
const users: Map<string, SecureUser> = new Map();
const usersByEmail: Map<string, string> = new Map(); // email -> userId mapping
const usersByUsername: Map<string, string> = new Map(); // username -> userId mapping

// Security configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_EXPIRES = 60 * 60 * 1000; // 1 hour

/**
 * Initialize user management system with default admin user
 */
export async function initUserManagement(): Promise<void> {
  // Create default admin user if none exists
  if (users.size === 0) {
    const adminUser: SecureUser = {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@sentientedge.ai',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: await hashPassword('TempAdmin123!@#'), // Should be changed on first login
      refreshTokens: [],
      loginAttempts: 0,
      mfaEnabled: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    users.set(adminUser.id, adminUser);
    usersByEmail.set(adminUser.email, adminUser.id);
    usersByUsername.set(adminUser.username, adminUser.id);

    console.log('Default admin user created - Please change password on first login');
  }
}

/**
 * Create new user
 */
export async function createUser(userData: CreateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if email or username already exists
    if (usersByEmail.has(userData.email)) {
      return { success: false, error: 'Email already exists' };
    }

    if (usersByUsername.has(userData.username)) {
      return { success: false, error: 'Username already exists' };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(userData.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error };
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(userData.password);

    const newUser: SecureUser = {
      id: userId,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      passwordHash,
      refreshTokens: [],
      loginAttempts: 0,
      mfaEnabled: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: userData.createdBy,
    };

    // Store user
    users.set(userId, newUser);
    usersByEmail.set(userData.email, userId);
    usersByUsername.set(userData.username, userId);

    // Audit log
    auditLog({
      action: AuditAction.USER_CREATED,
      userId: userData.createdBy,
      resource: `/users/${userId}`,
      details: {
        createdUserId: userId,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      },
    });

    // Return user without sensitive data
    const { passwordHash, refreshTokens, ...publicUser } = newUser;
    return { success: true, user: publicUser as User };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

/**
 * Authenticate user login
 */
export async function authenticateUser(
  credentials: LoginCredentials,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const userEmail = credentials.email.toLowerCase();
  const userId = usersByEmail.get(userEmail);

  if (!userId) {
    auditLog({
      action: AuditAction.LOGIN_FAILED,
      userId: 'unknown',
      resource: '/auth/login',
      details: { email: userEmail, reason: 'User not found' },
      ipAddress,
      userAgent,
      success: false,
    });
    return { success: false, error: 'Invalid credentials' };
  }

  const user = users.get(userId);
  if (!user || !user.isActive) {
    auditLog({
      action: AuditAction.LOGIN_FAILED,
      userId,
      resource: '/auth/login',
      details: { reason: 'User inactive or not found' },
      ipAddress,
      userAgent,
      success: false,
    });
    return { success: false, error: 'Invalid credentials' };
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    auditLog({
      action: AuditAction.LOGIN_FAILED,
      userId,
      resource: '/auth/login',
      details: { reason: 'Account locked', lockedUntil: user.lockedUntil },
      ipAddress,
      userAgent,
      success: false,
    });
    return { 
      success: false, 
      error: 'Account temporarily locked due to too many failed attempts',
      lockedUntil: user.lockedUntil 
    };
  }

  // Verify password
  const passwordValid = await verifyPassword(credentials.password, user.passwordHash);
  if (!passwordValid) {
    // Increment login attempts
    user.loginAttempts++;
    
    // Lock account if too many attempts
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
      
      auditLog({
        action: AuditAction.ACCOUNT_LOCKED,
        userId,
        resource: '/auth/login',
        details: { loginAttempts: user.loginAttempts, lockedUntil: user.lockedUntil },
        ipAddress,
        userAgent,
        success: false,
      });
    }

    auditLog({
      action: AuditAction.LOGIN_FAILED,
      userId,
      resource: '/auth/login',
      details: { reason: 'Invalid password', loginAttempts: user.loginAttempts },
      ipAddress,
      userAgent,
      success: false,
    });

    return { success: false, error: 'Invalid credentials' };
  }

  // Check MFA if enabled
  if (user.mfaEnabled && !credentials.mfaCode) {
    return { success: false, requiresMFA: true, error: 'MFA code required' };
  }

  if (user.mfaEnabled && credentials.mfaCode) {
    // In production, verify TOTP code here
    // const mfaValid = verifyTOTP(user.mfaSecret, credentials.mfaCode);
    // For now, accept any 6-digit code
    if (!/^\d{6}$/.test(credentials.mfaCode)) {
      auditLog({
        action: AuditAction.LOGIN_FAILED,
        userId,
        resource: '/auth/login',
        details: { reason: 'Invalid MFA code' },
        ipAddress,
        userAgent,
        success: false,
      });
      return { success: false, error: 'Invalid MFA code' };
    }
  }

  // Successful login - reset login attempts
  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date().toISOString();

  // Generate tokens
  const { passwordHash, refreshTokens, ...publicUser } = user;
  const tokens = generateTokens(publicUser as User);

  // Store refresh token
  user.refreshTokens.push(tokens.refreshToken);

  auditLog({
    action: AuditAction.LOGIN_SUCCESS,
    userId,
    username: user.username,
    resource: '/auth/login',
    details: { lastLogin: user.lastLogin },
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    user: publicUser as User,
    tokens,
  };
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | null {
  const user = users.get(userId);
  if (!user) return null;

  const { passwordHash, refreshTokens, ...publicUser } = user;
  return publicUser as User;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const userId = usersByEmail.get(email.toLowerCase());
  if (!userId) return null;
  
  return getUserById(userId);
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updateData: UpdateUserData
): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = users.get(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Check for email/username conflicts
  if (updateData.email && updateData.email !== user.email) {
    if (usersByEmail.has(updateData.email)) {
      return { success: false, error: 'Email already exists' };
    }
  }

  if (updateData.username && updateData.username !== user.username) {
    if (usersByUsername.has(updateData.username)) {
      return { success: false, error: 'Username already exists' };
    }
  }

  // Update mappings if email/username changed
  if (updateData.email && updateData.email !== user.email) {
    usersByEmail.delete(user.email);
    usersByEmail.set(updateData.email, userId);
  }

  if (updateData.username && updateData.username !== user.username) {
    usersByUsername.delete(user.username);
    usersByUsername.set(updateData.username, userId);
  }

  // Track role changes for audit
  const roleChanged = updateData.role && updateData.role !== user.role;
  const oldRole = user.role;

  // Update user data
  Object.assign(user, {
    ...updateData,
    updatedBy: updateData.updatedBy,
    updatedAt: new Date().toISOString(),
  });

  // Audit log
  auditLog({
    action: AuditAction.USER_UPDATED,
    userId: updateData.updatedBy,
    resource: `/users/${userId}`,
    details: {
      updatedUserId: userId,
      username: user.username,
      changes: updateData,
      ...(roleChanged && { oldRole, newRole: updateData.role }),
    },
  });

  // Special audit for role changes
  if (roleChanged) {
    auditLog({
      action: AuditAction.USER_ROLE_CHANGED,
      userId: updateData.updatedBy,
      resource: `/users/${userId}`,
      details: {
        targetUserId: userId,
        username: user.username,
        oldRole,
        newRole: updateData.role,
      },
    });
  }

  const { passwordHash, refreshTokens, ...publicUser } = user;
  return { success: true, user: publicUser as User };
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  changedBy: string
): Promise<{ success: boolean; error?: string }> {
  const user = users.get(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password (unless changed by admin)
  if (changedBy === userId) {
    const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordValid) {
      auditLog({
        action: AuditAction.SECURITY_ERROR,
        userId,
        resource: '/auth/change-password',
        details: { reason: 'Invalid current password' },
        success: false,
      });
      return { success: false, error: 'Current password is incorrect' };
    }
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }

  // Update password
  user.passwordHash = await hashPassword(newPassword);
  user.refreshTokens = []; // Invalidate all refresh tokens
  user.updatedAt = new Date().toISOString();

  auditLog({
    action: AuditAction.PASSWORD_RESET_SUCCESS,
    userId: changedBy,
    resource: '/auth/change-password',
    details: {
      targetUserId: userId,
      isAdminReset: changedBy !== userId,
    },
  });

  return { success: true };
}

/**
 * List users with filtering
 */
export function listUsers(filters: {
  role?: User['role'];
  isActive?: boolean;
  limit?: number;
  offset?: number;
} = {}): { users: User[]; total: number } {
  let filteredUsers = Array.from(users.values());

  // Apply filters
  if (filters.role) {
    filteredUsers = filteredUsers.filter(user => user.role === filters.role);
  }

  if (filters.isActive !== undefined) {
    filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
  }

  const total = filteredUsers.length;

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  // Remove sensitive data
  const publicUsers = paginatedUsers.map(user => {
    const { passwordHash, refreshTokens, ...publicUser } = user;
    return publicUser as User;
  });

  return { users: publicUsers, total };
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password123',
    'admin123456',
    'letmein123',
    'welcome123',
    'password1234',
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return { valid: false, error: 'Password is too common' };
  }

  return { valid: true };
}

/**
 * Initialize user management on module load
 */
initUserManagement().catch(console.error);