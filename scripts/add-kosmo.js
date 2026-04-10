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
  await setDoc(doc(db, 'preRegisteredStewards', '56653'), {
    badgeNumber: '56653',
    name: 'Kosmo Silimanis',
    addedAt: serverTimestamp(),
  });
  console.log('Kosmo Silimanis (badge 56653) added as pre-registered shop steward!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
