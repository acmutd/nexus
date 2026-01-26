const admin = require('firebase-admin');
// require('dotenv').config();

function parseServiceAccount(raw) {
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  }

  // Handle both inline JSON and JSON with literal newlines.
  const attempts = [
    raw,
    raw.replace(/\n/g, '\\n'), // when the key was pasted with real newlines
  ];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // cooked
    }
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed');
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });

  console.log('Firebase Admin initialized');
}

const db = admin.firestore();

module.exports = { admin, db };
