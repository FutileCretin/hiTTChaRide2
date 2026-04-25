const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
  const badges = ['82821', '69950'];
  for (const badge of badges) {
    const snap = await getDoc(doc(db, 'godAccounts', badge));
    console.log(`Badge ${badge}: ${snap.exists() ? '✅ found' : '❌ NOT found'}`);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
