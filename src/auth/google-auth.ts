import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { loadToken, saveToken, TokenData } from './token-manager';
import open from 'open';

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  'credentials',
  'client_secret.json'
);
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

/**
 * Authenticate with Google Calendar API using OAuth 2.0
 */
export async function authenticate(): Promise<any> {
  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials file not found at ${CREDENTIALS_PATH}\nPlease place your client_secret.json in the credentials folder.`
    );
  }

  // Load credentials
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );

  // Check if we have a saved token
  const token = loadToken();

  if (token) {
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }

  // No token found, need to authenticate
  return await getNewToken(oauth2Client);
}

/**
 * Get a new token by starting OAuth flow
 */
async function getNewToken(oauth2Client: any): Promise<any> {
  // Start local server FIRST, before opening browser
  const codePromise = startCallbackServer();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n📝 First-time setup: Authorization required');
  console.log('\nOpening browser for authorization...');
  console.log('\nIf the browser does not open automatically, visit this URL:');
  console.log(authUrl);
  console.log('');

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try to open browser
  try {
    await open(authUrl);
  } catch (error) {
    console.error('⚠️  Could not open browser automatically. Please copy the URL above.');
  }

  // Wait for callback
  const code = await codePromise;

  console.log('\n✓ Authorization code received, exchanging for tokens...');

  // Exchange code for tokens
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save tokens
    saveToken(tokens as TokenData);

    console.log('✓ Authorization successful!\n');

    return oauth2Client;
  } catch (error: any) {
    if (error.message?.includes('invalid_grant')) {
      throw new Error('Authorization code expired or invalid. Please try again.');
    }
    throw error;
  }
}

/**
 * Start a local server to receive OAuth callback
 */
function startCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url?.startsWith('/oauth2callback')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(403, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authorization Failed</h1>
                <p>Error: ${error}</p>
                <p>Please check the terminal for instructions.</p>
              </body>
            </html>
          `);

          server.close();

          if (error === 'access_denied') {
            reject(new Error(
              '\n❌ Access denied. Please ensure:\n' +
              '1. You added your email as a test user in Google Cloud Console\n' +
              '2. Go to: https://console.cloud.google.com/\n' +
              '3. Select project → APIs & Services → OAuth consent screen\n' +
              '4. Scroll to "Test users" → Add your Gmail address\n' +
              '5. Try running the command again'
            ));
          } else {
            reject(new Error(`Authorization error: ${error}`));
          }
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Authorization failed - no code received');
          server.close();
          reject(new Error('No authorization code received'));
        }
      }
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('Port 3000 is already in use. Please close other applications using this port.'));
      } else {
        reject(err);
      }
    });

    server.listen(3000, () => {
      console.log('✓ Authorization server ready on http://localhost:3000');
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timeout'));
    }, 5 * 60 * 1000);
  });
}
