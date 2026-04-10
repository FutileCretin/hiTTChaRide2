const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, setDoc, serverTimestamp } = require('firebase/firestore');

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
  // Delete the user record so the app creates it fresh with the real device ID
  await deleteDoc(doc(db, 'users', '82821'));

  // Keep preRegisteredStewards so it still auto-approves
  await setDoc(doc(db, 'preRegisteredStewards', '82821'), {
    badgeNumber: '82821',
    name: 'John Ng',
    addedAt: serverTimestamp(),
  });

  console.log('Done! Badge 82821 reset — sign in fresh on your phone now.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
