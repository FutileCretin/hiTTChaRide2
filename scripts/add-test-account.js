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
  // Add Testie McTesty as a pre-registered steward so they can log in
  await setDoc(doc(db, 'preRegisteredStewards', '42069'), {
    badgeNumber: '42069',
    name: 'Testie McTesty',
    addedAt: serverTimestamp(),
  });

  // Add approved user profile for Testie McTesty
  await setDoc(doc(db, 'users', '42069'), {
    badgeNumber: '42069',
    name: 'Testie McTesty',
    deviceId: 'test-device-google-review',
    status: 'approved',
    isShopSteward: true,
    isAdmin: false,
    avatarConfig: { style: 'conductor', skinTone: '#C68642' },
    registeredAt: serverTimestamp(),
  });

  console.log('Testie McTesty (badge 42069) added as approved test account!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
