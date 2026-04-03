// Shop Steward 2-month confirmation cycle
// On login, users are prompted to confirm their shop steward is still in place

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const CYCLE_DAYS = 61; // ~2 months

export interface StewardRecord {
  badgeNumber: string;
  name: string;
  appointedAt: Timestamp;
  lastConfirmedAt?: Timestamp;
  nextConfirmDue: Timestamp;
  confirmationStats: {
    yesCount: number;
    noCount: number;
    totalResponded: number;
  };
}

// Check if a user needs to answer the steward confirmation prompt
export async function needsStewardConfirmation(badgeNumber: string): Promise<{
  needed: boolean;
  steward?: StewardRecord;
}> {
  // Find the active shop steward
  const stewardSnap = await getDocs(
    query(collection(db, 'stewards'), where('isActive', '==', true))
  );

  if (stewardSnap.empty) return { needed: false };

  const steward = stewardSnap.docs[0].data() as StewardRecord;

  // Check if this user has already answered this cycle
  const responseRef = doc(db, 'stewardResponses', `${steward.badgeNumber}_${badgeNumber}`);
  const responseSnap = await getDoc(responseRef);

  if (!responseSnap.exists()) {
    return { needed: true, steward };
  }

  const response = responseSnap.data();
  const cycleStart = steward.lastConfirmedAt ?? steward.appointedAt;
  const cycleStartMs = cycleStart.toMillis();
  const respondedAt = response.respondedAt?.toMillis() ?? 0;

  // If their response was before the current cycle started, prompt again
  if (respondedAt < cycleStartMs) {
    return { needed: true, steward };
  }

  return { needed: false };
}

// Record a user's yes/no response to the steward confirmation
export async function recordStewardConfirmation(
  stewardBadge: string,
  userBadge: string,
  confirmed: boolean
) {
  const responseRef = doc(db, 'stewardResponses', `${stewardBadge}_${userBadge}`);
  await setDoc(responseRef, {
    stewardBadge,
    userBadge,
    confirmed,
    respondedAt: serverTimestamp(),
  });

  // Tally the vote on the steward record
  const stewardRef = doc(db, 'stewards', stewardBadge);
  const stewardSnap = await getDoc(stewardRef);
  if (!stewardSnap.exists()) return;

  const data = stewardSnap.data() as StewardRecord;
  const stats = data.confirmationStats ?? { yesCount: 0, noCount: 0, totalResponded: 0 };

  await updateDoc(stewardRef, {
    confirmationStats: {
      yesCount: stats.yesCount + (confirmed ? 1 : 0),
      noCount: stats.noCount + (confirmed ? 0 : 1),
      totalResponded: stats.totalResponded + 1,
    },
  });
}

// Shop steward hands over privileges to a new person
// This sends a notification to all users asking them to confirm
export async function initiateHandover(
  currentStewardBadge: string,
  newStewardBadge: string,
  newStewardName: string
) {
  // Create handover request in Firestore
  await setDoc(doc(db, 'stewardHandovers', `${currentStewardBadge}_to_${newStewardBadge}`), {
    fromBadge: currentStewardBadge,
    toBadge: newStewardBadge,
    toName: newStewardName,
    status: 'pending_confirmation',
    yesCount: 0,
    noCount: 0,
    createdAt: serverTimestamp(),
  });

  // Mark current steward as "handover in progress"
  await updateDoc(doc(db, 'stewards', currentStewardBadge), {
    handoverInProgress: true,
    handoverToBadge: newStewardBadge,
  });
}
