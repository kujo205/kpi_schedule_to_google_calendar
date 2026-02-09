import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TOKEN_DIR = path.join(os.homedir(), '.kpi-calendar');
const TOKEN_PATH = path.join(TOKEN_DIR, 'token.json');

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

/**
 * Ensure the token directory exists
 */
export function ensureTokenDir(): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load token from file system
 */
export function loadToken(): TokenData | null {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }
    const tokenData = fs.readFileSync(TOKEN_PATH, 'utf-8');
    return JSON.parse(tokenData);
  } catch (error) {
    console.error('Error loading token:', error);
    return null;
  }
}

/**
 * Save token to file system
 */
export function saveToken(token: TokenData): void {
  try {
    ensureTokenDir();
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), {
      mode: 0o600,
    });
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
}

/**
 * Delete token file (for re-authentication)
 */
export function deleteToken(): void {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
  } catch (error) {
    console.error('Error deleting token:', error);
    throw error;
  }
}

/**
 * Get token path for display purposes
 */
export function getTokenPath(): string {
  return TOKEN_PATH;
}
