// One-time script — run once in CMD: node update-admin-role.js
// Sets badge 82821 as hidden super-admin in Firestore (isAdmin: true, isShopSteward: false)

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBdgD-KPe2mkG37nTP1al17A63pvEKyuFw',
  authDomain: 'hittcharide.firebaseapp.com',
  projectId: 'hittcharide',
  storageBucket: 'hittcharide.firebasestorage.app',
  messagingSenderId: '516684467674',
  appId: '1:516684467674:web:b0d621c6bf93e373b5c4e3',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    await updateDoc(doc(db, 'users', '82821'), {
      isAdmin: true,
      isShopSteward: false,
    });
    console.log('✓ Badge 82821 is now the hidden super-admin.');
    console.log('  isAdmin: true  |  isShopSteward: false');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

run();
