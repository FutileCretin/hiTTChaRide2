const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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
  // Pre-register badge 82821 as a shop steward so it auto-approves on any device
  await setDoc(doc(db, 'preRegisteredStewards', '82821'), {
    badgeNumber: '82821',
    name: 'John Ng',
    addedAt: serverTimestamp(),
  });

  // Add approved user profile for badge 82821
  await setDoc(doc(db, 'users', '82821'), {
    badgeNumber: '82821',
    name: 'John Ng',
    deviceId: 'admin-device',
    status: 'approved',
    isShopSteward: true,
    isAdmin: true,
    avatarConfig: { style: 'conductor', skinTone: '#C68642' },
    registeredAt: serverTimestamp(),
  });

  console.log('Badge 82821 (John Ng) added as admin + shop steward!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
