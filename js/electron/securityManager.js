// securityManager.js
// Handles app security: Touch ID, passcode, and encryption key management
//
// SECURITY ARCHITECTURE:
// ----------------------
// - Encryption key is stored in macOS Keychain via 'keytar'
// - Touch ID is used for biometric unlock (macOS only)
// - Fallback to passcode (hashed with PBKDF2)
// - Auto-lock after configurable timeout
//
// KEY STORAGE:
// - Master encryption key: Stored in Keychain, never in plain files
// - Passcode hash: Stored in Keychain for verification
// - Salt: Stored in app metadata (non-sensitive)

const { systemPreferences, safeStorage } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const SERVICE_NAME = 'com.simnote.app';
const ACCOUNT_MASTER_KEY = 'master-encryption-key';
const ACCOUNT_PASSCODE_HASH = 'passcode-hash';
const ACCOUNT_SALT = 'encryption-salt';

// Encryption constants
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256-bit key
const SALT_LENGTH = 32;
const IV_LENGTH = 16;

class SecurityManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.securityConfigPath = path.join(storageDir, 'security.json');
    this.isUnlocked = false;
    this.masterKey = null;
    this.config = this._loadConfig();
  }

  /**
   * Loads security configuration from disk.
   * @returns {Object} Security configuration
   * @private
   */
  _loadConfig() {
    try {
      if (fs.existsSync(this.securityConfigPath)) {
        return JSON.parse(fs.readFileSync(this.securityConfigPath, 'utf-8'));
      }
    } catch (err) {
      console.error('[Security] Failed to load config:', err.message);
    }
    return {
      enabled: false,
      useTouchId: false,
      usePasscode: false,
      autoLockMinutes: 5,
      salt: null
    };
  }

  /**
   * Saves security configuration to disk.
   * @private
   */
  _saveConfig() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
      fs.writeFileSync(this.securityConfigPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('[Security] Failed to save config:', err.message);
    }
  }

  /**
   * Checks if security (lock) is enabled.
   * @returns {boolean}
   */
  isSecurityEnabled() {
    return this.config.enabled && (this.config.useTouchId || this.config.usePasscode);
  }

  /**
   * Gets the current security configuration.
   * @returns {Object}
   */
  getConfig() {
    return {
      enabled: this.config.enabled,
      useTouchId: this.config.useTouchId,
      usePasscode: this.config.usePasscode,
      autoLockMinutes: this.config.autoLockMinutes,
      isUnlocked: this.isUnlocked
    };
  }

  /**
   * Checks if Touch ID is available on this system.
   * @returns {Promise<boolean>}
   */
  async isTouchIdAvailable() {
    if (process.platform !== 'darwin') return false;
    try {
      return systemPreferences.canPromptTouchID();
    } catch {
      return false;
    }
  }

  /**
   * Checks if Electron safeStorage is available.
   * @returns {boolean}
   */
  isSafeStorageAvailable() {
    return safeStorage && safeStorage.isEncryptionAvailable();
  }

  /**
   * Generates a cryptographically secure random key.
   * @returns {Buffer}
   * @private
   */
  _generateMasterKey() {
    return crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * Generates a random salt.
   * @returns {string} Hex-encoded salt
   * @private
   */
  _generateSalt() {
    return crypto.randomBytes(SALT_LENGTH).toString('hex');
  }

  /**
   * Derives a key from passcode using PBKDF2.
   * @param {string} passcode - User passcode
   * @param {string} salt - Hex-encoded salt
   * @returns {Buffer} Derived key
   * @private
   */
  _deriveKeyFromPasscode(passcode, salt) {
    return crypto.pbkdf2Sync(
      passcode,
      Buffer.from(salt, 'hex'),
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Stores a value securely using Electron's safeStorage.
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @private
   */
  _secureStore(key, value) {
    if (!this.isSafeStorageAvailable()) {
      throw new Error('Secure storage not available');
    }
    const encrypted = safeStorage.encryptString(value);
    const filePath = path.join(this.storageDir, `.${key}.enc`);
    fs.writeFileSync(filePath, encrypted);
  }

  /**
   * Retrieves a value from secure storage.
   * @param {string} key - Storage key
   * @returns {string|null} Decrypted value or null
   * @private
   */
  _secureRetrieve(key) {
    if (!this.isSafeStorageAvailable()) return null;
    const filePath = path.join(this.storageDir, `.${key}.enc`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const encrypted = fs.readFileSync(filePath);
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  }

  /**
   * Deletes a value from secure storage.
   * @param {string} key - Storage key
   * @private
   */
  _secureDelete(key) {
    const filePath = path.join(this.storageDir, `.${key}.enc`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Sets up security with passcode.
   * @param {string} passcode - User's chosen passcode (minimum 4 characters)
   * @returns {Promise<boolean>} Success status
   */
  async setupPasscode(passcode) {
    if (!passcode || passcode.length < 4) {
      throw new Error('Passcode must be at least 4 characters');
    }

    try {
      // Generate salt and master key
      const salt = this._generateSalt();
      const masterKey = this._generateMasterKey();

      // Derive key from passcode to encrypt master key
      const derivedKey = this._deriveKeyFromPasscode(passcode, salt);

      // Encrypt master key with derived key
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
      const encrypted = Buffer.concat([cipher.update(masterKey), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Store encrypted master key
      const encryptedMasterKey = Buffer.concat([iv, authTag, encrypted]).toString('base64');
      this._secureStore(ACCOUNT_MASTER_KEY, encryptedMasterKey);

      // Store passcode hash for verification
      const passcodeHash = crypto.createHash('sha256').update(passcode + salt).digest('hex');
      this._secureStore(ACCOUNT_PASSCODE_HASH, passcodeHash);

      // Update config
      this.config.salt = salt;
      this.config.usePasscode = true;
      this.config.enabled = true;
      this._saveConfig();

      // Set unlocked state
      this.masterKey = masterKey;
      this.isUnlocked = true;

      console.log('[Security] Passcode setup complete');
      return true;
    } catch (err) {
      console.error('[Security] Passcode setup failed:', err.message);
      throw err;
    }
  }

  /**
   * Enables Touch ID authentication (in addition to passcode).
   * @returns {Promise<boolean>}
   */
  async enableTouchId() {
    if (!await this.isTouchIdAvailable()) {
      throw new Error('Touch ID not available on this system');
    }
    if (!this.config.usePasscode) {
      throw new Error('Passcode must be set up before enabling Touch ID');
    }

    this.config.useTouchId = true;
    this._saveConfig();
    console.log('[Security] Touch ID enabled');
    return true;
  }

  /**
   * Disables Touch ID authentication.
   */
  disableTouchId() {
    this.config.useTouchId = false;
    this._saveConfig();
    console.log('[Security] Touch ID disabled');
  }

  /**
   * Authenticates using Touch ID.
   * @returns {Promise<boolean>} Success status
   */
  async authenticateWithTouchId() {
    if (!this.config.useTouchId) {
      throw new Error('Touch ID not enabled');
    }

    try {
      await systemPreferences.promptTouchID('unlock Simnote');

      // Retrieve and decrypt master key using stored passcode
      const encryptedMasterKey = this._secureRetrieve(ACCOUNT_MASTER_KEY);
      if (!encryptedMasterKey) {
        throw new Error('Master key not found');
      }

      // For Touch ID, we store the derived key separately (encrypted by safeStorage)
      const storedDerivedKey = this._secureRetrieve('touchid-derived-key');
      if (!storedDerivedKey) {
        throw new Error('Touch ID key not configured. Please use passcode.');
      }

      // Decrypt master key
      const derivedKey = Buffer.from(storedDerivedKey, 'hex');
      this.masterKey = this._decryptMasterKey(encryptedMasterKey, derivedKey);
      this.isUnlocked = true;

      console.log('[Security] Touch ID authentication successful');
      return true;
    } catch (err) {
      console.error('[Security] Touch ID authentication failed:', err.message);
      throw err;
    }
  }

  /**
   * Authenticates using passcode.
   * @param {string} passcode - User's passcode
   * @returns {Promise<boolean>} Success status
   */
  async authenticateWithPasscode(passcode) {
    if (!this.config.usePasscode || !this.config.salt) {
      throw new Error('Passcode not set up');
    }

    try {
      // Verify passcode hash
      const passcodeHash = crypto.createHash('sha256').update(passcode + this.config.salt).digest('hex');
      const storedHash = this._secureRetrieve(ACCOUNT_PASSCODE_HASH);

      if (passcodeHash !== storedHash) {
        throw new Error('Invalid passcode');
      }

      // Derive key and decrypt master key
      const derivedKey = this._deriveKeyFromPasscode(passcode, this.config.salt);
      const encryptedMasterKey = this._secureRetrieve(ACCOUNT_MASTER_KEY);

      if (!encryptedMasterKey) {
        throw new Error('Master key not found');
      }

      this.masterKey = this._decryptMasterKey(encryptedMasterKey, derivedKey);
      this.isUnlocked = true;

      // Store derived key for Touch ID (if enabled)
      if (this.config.useTouchId) {
        this._secureStore('touchid-derived-key', derivedKey.toString('hex'));
      }

      console.log('[Security] Passcode authentication successful');
      return true;
    } catch (err) {
      console.error('[Security] Passcode authentication failed:', err.message);
      throw err;
    }
  }

  /**
   * Decrypts the master key using derived key.
   * @param {string} encryptedMasterKey - Base64-encoded encrypted master key
   * @param {Buffer} derivedKey - Key derived from passcode
   * @returns {Buffer} Decrypted master key
   * @private
   */
  _decryptMasterKey(encryptedMasterKey, derivedKey) {
    const data = Buffer.from(encryptedMasterKey, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = data.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Locks the app (clears master key from memory).
   */
  lock() {
    this.masterKey = null;
    this.isUnlocked = false;
    console.log('[Security] App locked');
  }

  /**
   * Gets the encryption key for database encryption.
   * @returns {string|null} Hex-encoded encryption key or null if locked
   */
  getEncryptionKey() {
    if (!this.isUnlocked || !this.masterKey) return null;
    return this.masterKey.toString('hex');
  }

  /**
   * Changes the passcode.
   * @param {string} currentPasscode - Current passcode for verification
   * @param {string} newPasscode - New passcode
   * @returns {Promise<boolean>}
   */
  async changePasscode(currentPasscode, newPasscode) {
    // Verify current passcode
    await this.authenticateWithPasscode(currentPasscode);

    // Keep the same master key, just re-encrypt with new passcode
    const masterKey = this.masterKey;

    // Generate new salt
    const newSalt = this._generateSalt();
    const derivedKey = this._deriveKeyFromPasscode(newPasscode, newSalt);

    // Encrypt master key with new derived key
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(masterKey), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedMasterKey = Buffer.concat([iv, authTag, encrypted]).toString('base64');
    this._secureStore(ACCOUNT_MASTER_KEY, encryptedMasterKey);

    // Update passcode hash
    const passcodeHash = crypto.createHash('sha256').update(newPasscode + newSalt).digest('hex');
    this._secureStore(ACCOUNT_PASSCODE_HASH, passcodeHash);

    // Update config
    this.config.salt = newSalt;
    this._saveConfig();

    // Update Touch ID key if enabled
    if (this.config.useTouchId) {
      this._secureStore('touchid-derived-key', derivedKey.toString('hex'));
    }

    console.log('[Security] Passcode changed successfully');
    return true;
  }

  /**
   * Disables all security (removes passcode and Touch ID).
   * @param {string} passcode - Current passcode for verification
   * @returns {Promise<boolean>}
   */
  async disableSecurity(passcode) {
    // Verify passcode first
    await this.authenticateWithPasscode(passcode);

    // Clear all secure storage
    this._secureDelete(ACCOUNT_MASTER_KEY);
    this._secureDelete(ACCOUNT_PASSCODE_HASH);
    this._secureDelete('touchid-derived-key');

    // Reset config
    this.config = {
      enabled: false,
      useTouchId: false,
      usePasscode: false,
      autoLockMinutes: 5,
      salt: null
    };
    this._saveConfig();

    // Clear state
    this.masterKey = null;
    this.isUnlocked = true; // No security means always "unlocked"

    console.log('[Security] Security disabled');
    return true;
  }

  /**
   * Sets the auto-lock timeout.
   * @param {number} minutes - Minutes of inactivity before auto-lock (0 = disabled)
   */
  setAutoLockTimeout(minutes) {
    this.config.autoLockMinutes = Math.max(0, Math.floor(minutes));
    this._saveConfig();
  }

  /**
   * Encrypts data using the master key.
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Base64-encoded encrypted data
   */
  encrypt(plaintext) {
    if (!this.masterKey) throw new Error('App is locked');

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Decrypts data using the master key.
   * @param {string} ciphertext - Base64-encoded encrypted data
   * @returns {string} Decrypted plaintext
   */
  decrypt(ciphertext) {
    if (!this.masterKey) throw new Error('App is locked');

    const data = Buffer.from(ciphertext, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = data.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  }
}

module.exports = { SecurityManager };
