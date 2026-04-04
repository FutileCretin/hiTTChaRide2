// Shop steward appointment service
// Handles the full lifecycle: create → accept/reject → community vote

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface AppointmentRecord {
  id: string;
  appointedBadge: string;
  appointedName: string;
  appointingBadge: string;
  appointingName: string;
  // null when the admin (not a regular steward) is doing the appointing
  previousStewardBadge: string | null;
  previousStewardName: string | null;
  status: 'pending_acceptance' | 'active' | 'rejected';
  // badgeNumber → true (yes) | false (no)
  communityVotes: Record<string, boolean>;
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
}

export interface ApprovedOperator {
  badgeNumber: string;
  name: string;
}

// ── Create appointment ────────────────────────────────────────────────────────
// Called by admin or current shop steward when they pick someone to appoint.
export async function createAppointment(
  appointedBadge: string,
  appointedName: string,
  appointingBadge: string,
  appointingName: string,
  previousStewardBadge: string | null,
  previousStewardName: string | null
): Promise<string> {
  const ref = await addDoc(collection(db, 'stewardAppointments'), {
    appointedBadge,
    appointedName,
    appointingBadge,
    appointingName,
    previousStewardBadge,
    previousStewardName,
    status: 'pending_acceptance',
    communityVotes: {},
    createdAt: serverTimestamp(),
    acceptedAt: null,
  });
  return ref.id;
}

// ── Accept or reject appointment ─────────────────────────────────────────────
// Called by the person who was appointed.
export async function respondToAppointment(
  appointmentId: string,
  accept: boolean,
  appointedBadge: string,
  previousStewardBadge: string | null
): Promise<void> {
  const aptRef = doc(db, 'stewardAppointments', appointmentId);

  if (!accept) {
    await updateDoc(aptRef, { status: 'rejected' });
    return;
  }

  // Mark appointment active
  await updateDoc(aptRef, {
    status: 'active',
    acceptedAt: serverTimestamp(),
  });

  // Grant steward privileges to the new person
  await updateDoc(doc(db, 'users', appointedBadge), {
    isShopSteward: true,
  });

  // Remove steward privileges from the previous steward (skip if admin appointed)
  if (previousStewardBadge) {
    await updateDoc(doc(db, 'users', previousStewardBadge), {
      isShopSteward: false,
    });
  }
}

// ── Community vote ────────────────────────────────────────────────────────────
// Called when any user taps Yes or No on the community notification.
export async function voteOnAppointment(
  appointmentId: string,
  voterBadge: string,
  vote: boolean
): Promise<void> {
  await updateDoc(doc(db, 'stewardAppointments', appointmentId), {
    [`communityVotes.${voterBadge}`]: vote,
  });
}

// ── Get list of operators eligible to be appointed ───────────────────────────
// Returns approved operators who are not already admin or shop steward.
export async function getApprovedOperators(): Promise<ApprovedOperator[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('status', '==', 'approved'))
  );
  const operators: ApprovedOperator[] = [];
  snap.forEach((d) => {
    const data = d.data();
    // Exclude existing stewards and the admin
    if (!data.isShopSteward && !data.isAdmin) {
      operators.push({ badgeNumber: data.badgeNumber, name: data.name });
    }
  });
  operators.sort((a, b) => a.name.localeCompare(b.name));
  return operators;
}

// ── Subscribe: pending offer for the appointed person ────────────────────────
// Fires when someone has been appointed and is waiting to accept/reject.
export function subscribeToMyPendingAppointment(
  badgeNumber: string,
  callback: (appointment: AppointmentRecord | null) => void
): () => void {
  const q = query(
    collection(db, 'stewardAppointments'),
    where('appointedBadge', '==', badgeNumber),
    where('status', '==', 'pending_acceptance')
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as AppointmentRecord);
  });
}

// ── Subscribe: active appointment for community vote ─────────────────────────
// Fires for all users when a new steward has just accepted the role.
// Only surfaces appointments accepted within the last 7 days that the user
// hasn't voted on yet.
export function subscribeToActiveCommunityVote(
  myBadge: string,
  callback: (appointment: AppointmentRecord | null) => void
): () => void {
  const q = query(
    collection(db, 'stewardAppointments'),
    where('status', '==', 'active')
  );
  return onSnapshot(q, (snap) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const d of snap.docs) {
      const data = d.data() as Omit<AppointmentRecord, 'id'>;
      const acceptedMs = data.acceptedAt?.toMillis() ?? 0;
      const alreadyVoted = myBadge in data.communityVotes;
      // Don't show if they were the appointed person or the appointing person
      const isInvolved =
        data.appointedBadge === myBadge || data.appointingBadge === myBadge;

      if (acceptedMs > sevenDaysAgo && !alreadyVoted && !isInvolved) {
        callback({ id: d.id, ...data } as AppointmentRecord);
        return;
      }
    }
    callback(null);
  });
}
