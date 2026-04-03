const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, Timestamp } = require('firebase/firestore');

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

async function setup() {
  await updateDoc(doc(db, 'users', '82821'), {
    status: 'approved',
    isShopSteward: true,
    firstLogin: true,
  });

  await setDoc(doc(db, 'preRegisteredStewards', '82821'), {
    addedAt: Timestamp.now(),
    note: 'Shop Steward - Admin',
  });

  console.log('Done! Badge 82821 approved as Shop Steward.');
  process.exit(0);
}

setup().catch(e => { console.error(e.message); process.exit(1); });
