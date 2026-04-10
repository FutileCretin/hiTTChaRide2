const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, updateDoc } = require('firebase/firestore');

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
  // Remove fake/unauthorized users
  await deleteDoc(doc(db, 'users', '12345'));
  console.log('Removed: John Smith (12345)');

  await deleteDoc(doc(db, 'users', '12357'));
  console.log('Removed: John Sm (12357)');

  await deleteDoc(doc(db, 'users', '75302'));
  console.log('Removed: ncpoig (75302)');

  // Fix your own name on 82821
  await updateDoc(doc(db, 'users', '82821'), { name: 'John Ng' });
  console.log('Fixed: Badge 82821 name set to John Ng');

  console.log('\nDone! Testie McTesty (42069) kept.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
