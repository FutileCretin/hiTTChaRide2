const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
  const snap = await getDocs(collection(db, 'users'));
  console.log('\n--- ALL USERS ---');
  snap.docs.forEach(d => {
    const u = d.data();
    console.log(`Badge: ${u.badgeNumber} | Name: ${u.name} | Status: ${u.status} | Admin: ${u.isAdmin ?? false}`);
  });
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
