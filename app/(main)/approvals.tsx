// Pending Approvals + Appoint Shop Steward — visible to shop stewards and admin

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import {
  createAppointment,
  getApprovedOperators,
  ApprovedOperator,
} from '../../services/stewardAppointment';

interface PendingUser {
  badgeNumber: string;
  name: string;
  registeredAt: Timestamp;
  deviceChangedAt?: Timestamp;
}

export default function ApprovalsScreen() {
  const { profile } = useAuth();
  const [pending, setPending]         = useState<PendingUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState<string | null>(null);

  // Appoint flow state
  const [showAppoint, setShowAppoint]       = useState(false);
  const [operators, setOperators]           = useState<ApprovedOperator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [appointing, setAppointing]         = useState<string | null>(null);

  // Notification toggle
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('approvalNotifications').then(val => {
      if (val !== null) setNotifEnabled(val === 'true');
    });
  }, []);

  const toggleNotif = (val: boolean) => {
    setNotifEnabled(val);
    SecureStore.setItemAsync('approvalNotifications', String(val));
  };

  // Manage users state
  const [showManage, setShowManage]         = useState(false);
  const [allUsers, setAllUsers]             = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers]     = useState(false);
  const [suspending, setSuspending]         = useState<string | null>(null);

  // Live pending approvals
  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      const users: PendingUser[] = snap.docs.map((d) => d.data() as PendingUser);
      users.sort((a, b) => b.registeredAt.toMillis() - a.registeredAt.toMillis());
      setPending(users);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDecision = (user: PendingUser, approve: boolean) => {
    Alert.alert(
      `${approve ? 'Approve' : 'Deny'} Operator`,
      `Are you sure you want to ${approve ? 'approve' : 'deny'} ${user.name} (Badge #${user.badgeNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Deny',
          style: approve ? 'default' : 'destructive',
          onPress: () => processDecision(user.badgeNumber, approve),
        },
      ]
    );
  };

  const processDecision = async (badgeNumber: string, approve: boolean) => {
    setProcessing(badgeNumber);
    try {
      await updateDoc(doc(db, 'users', badgeNumber), {
        status: approve ? 'approved' : 'denied',
        reviewedAt: Timestamp.now(),
      });
    } catch {
      Alert.alert('Error', 'Could not process this request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // Open the appoint modal — load eligible operators
  const openAppointModal = async () => {
    setShowAppoint(true);
    setLoadingOperators(true);
    try {
      const list = await getApprovedOperators();
      setOperators(list);
    } catch {
      Alert.alert('Error', 'Could not load operators.');
    } finally {
      setLoadingOperators(false);
    }
  };

  const confirmAppoint = (operator: ApprovedOperator) => {
    const previousName  = profile?.isShopSteward ? profile.name : null;
    const previousBadge = profile?.isShopSteward ? profile.badgeNumber : null;

    const stepping = previousBadge
      ? `\n\nNote: You (${previousName}) will step down as Shop Steward.`
      : '';

    Alert.alert(
      'Appoint Shop Steward',
      `Appoint ${operator.name} (Badge #${operator.badgeNumber}) as the new Shop Steward?${stepping}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Appoint',
          onPress: () => doAppoint(operator, previousBadge, previousName),
        },
      ]
    );
  };

  const doAppoint = async (
    operator: ApprovedOperator,
    previousBadge: string | null,
    previousName: string | null
  ) => {
    if (!profile) return;
    setAppointing(operator.badgeNumber);
    try {
      await createAppointment(
        operator.badgeNumber,
        operator.name,
        profile.badgeNumber,
        profile.name,
        previousBadge,
        previousName
      );
      setShowAppoint(false);
      Alert.alert(
        'Appointment Sent',
        `${operator.name} will see a notification to accept or decline the role.`
      );
    } catch {
      Alert.alert('Error', 'Could not send appointment. Please try again.');
    } finally {
      setAppointing(null);
    }
  };

  // Open manage users modal — load all non-pending users
  const openManageModal = async () => {
    setShowManage(true);
    setLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('status', '==', 'approved')));
      const users: PendingUser[] = snap.docs
        .map((d) => d.data() as PendingUser)
        .filter((u) => u.badgeNumber !== profile?.badgeNumber) // don't show yourself
        .sort((a, b) => a.name.localeCompare(b.name));
      setAllUsers(users);
    } catch {
      Alert.alert('Error', 'Could not load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const confirmSuspend = (user: PendingUser) => {
    Alert.alert(
      'Remove User',
      `Remove ${user.name} (Badge #${user.badgeNumber})? They will not be able to log in until re-approved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => doSuspend(user.badgeNumber) },
      ]
    );
  };

  const doSuspend = async (badgeNumber: string) => {
    setSuspending(badgeNumber);
    try {
      await updateDoc(doc(db, 'users', badgeNumber), { status: 'pending' });
      setAllUsers((prev) => prev.filter((u) => u.badgeNumber !== badgeNumber));
    } catch {
      Alert.alert('Error', 'Could not remove user. Please try again.');
    } finally {
      setSuspending(null);
    }
  };

  const formatDate = (ts: Timestamp) =>
    ts.toDate().toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const renderItem = ({ item }: { item: PendingUser }) => (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowBadge}>Badge #{item.badgeNumber}</Text>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowDate}>Submitted: {formatDate(item.registeredAt)}</Text>
        {item.deviceChangedAt && (
          <Text style={styles.rowWarning}>
            ⚠ Device change — {formatDate(item.deviceChangedAt)}
          </Text>
        )}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.approveBtn, processing === item.badgeNumber && styles.btnDisabled]}
          onPress={() => handleDecision(item, true)}
          disabled={processing === item.badgeNumber}
        >
          {processing === item.badgeNumber
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.approveBtnText}>Approve</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.denyBtn, processing === item.badgeNumber && styles.btnDisabled]}
          onPress={() => handleDecision(item, false)}
          disabled={processing === item.badgeNumber}
        >
          <Text style={styles.denyBtnText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Approvals</Text>
        {!loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {/* Notification toggle */}
      <View style={styles.notifRow}>
        <Text style={styles.notifLabel}>🔔 Notify me on new approvals</Text>
        <Switch
          value={notifEnabled}
          onValueChange={toggleNotif}
          trackColor={{ false: Colors.grayDark, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* Appoint Shop Steward button */}
      <View style={styles.appointSection}>
        <TouchableOpacity style={styles.appointBtn} onPress={openAppointModal}>
          <Text style={styles.appointBtnIcon}>🎖</Text>
          <View>
            <Text style={styles.appointBtnTitle}>Appoint Shop Steward</Text>
            <Text style={styles.appointBtnSub}>Select an approved operator to take the role</Text>
          </View>
        </TouchableOpacity>

        {/* Manage Users — shop stewards and admin */}
        {(profile?.isShopSteward || profile?.isAdmin) && (
          <TouchableOpacity style={[styles.appointBtn, styles.manageBtn]} onPress={openManageModal}>
            <Text style={styles.appointBtnIcon}>🗂</Text>
            <View>
              <Text style={styles.appointBtnTitle}>Manage Users</Text>
              <Text style={styles.appointBtnSub}>Remove or suspend approved operators</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.emptyBody}>No pending approval requests right now.</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.badgeNumber}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Manage Users modal ── */}
      <Modal visible={showManage} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Users</Text>
              <TouchableOpacity onPress={() => setShowManage(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading users...</Text>
              </View>
            ) : allUsers.length === 0 ? (
              <Text style={styles.noOperatorsText}>No approved users found.</Text>
            ) : (
              <ScrollView style={styles.operatorList} showsVerticalScrollIndicator={false}>
                {allUsers.map((u) => (
                  <View key={u.badgeNumber} style={styles.manageRow}>
                    <View>
                      <Text style={styles.operatorName}>{u.name}</Text>
                      <Text style={styles.operatorBadge}>Badge #{u.badgeNumber}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.removeBtn, suspending === u.badgeNumber && styles.btnDisabled]}
                      onPress={() => confirmSuspend(u)}
                      disabled={suspending !== null}
                    >
                      {suspending === u.badgeNumber
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <Text style={styles.removeBtnText}>Remove</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Appoint modal ── */}
      <Modal visible={showAppoint} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Operator to Appoint</Text>
              <TouchableOpacity onPress={() => setShowAppoint(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingOperators ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading operators...</Text>
              </View>
            ) : operators.length === 0 ? (
              <Text style={styles.noOperatorsText}>
                No eligible operators found. Operators must be approved before they can be appointed.
              </Text>
            ) : (
              <ScrollView style={styles.operatorList} showsVerticalScrollIndicator={false}>
                {operators.map((op) => (
                  <TouchableOpacity
                    key={op.badgeNumber}
                    style={[styles.operatorRow, appointing === op.badgeNumber && styles.btnDisabled]}
                    onPress={() => confirmAppoint(op)}
                    disabled={appointing !== null}
                  >
                    <View>
                      <Text style={styles.operatorName}>{op.name}</Text>
                      <Text style={styles.operatorBadge}>Badge #{op.badgeNumber}</Text>
                    </View>
                    {appointing === op.badgeNumber
                      ? <ActivityIndicator color={Colors.primary} size="small" />
                      : <Text style={styles.operatorChevron}>›</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    backgroundColor: Colors.surface, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText:  { color: Colors.white, fontWeight: '600', fontSize: 13 },
  title:        { flex: 1, color: Colors.white, fontSize: 20, fontWeight: '800' },
  countBadge: {
    backgroundColor: Colors.primary, width: 30, height: 30,
    borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifLabel: { color: Colors.textSecondary, fontSize: 14 },

  // Appoint section
  appointSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  appointBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.primary,
  },
  appointBtnIcon:  { fontSize: 28 },
  appointBtnTitle: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  appointBtnSub:   { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  list:  { padding: 20, gap: 12 },
  row: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 14,
  },
  rowInfo:    { gap: 3 },
  rowBadge:   { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  rowName:    { color: Colors.white, fontSize: 18, fontWeight: '700' },
  rowDate:    { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowWarning: { color: Colors.warning ?? '#F59E0B', fontSize: 12, fontWeight: '600', marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 10 },
  approveBtn: {
    flex: 1, backgroundColor: Colors.success,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  approveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  denyBtn: {
    flex: 1, backgroundColor: Colors.grayDark,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.danger,
  },
  denyBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { color: Colors.textSecondary, fontSize: 14 },
  emptyContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:        { fontSize: 56, color: Colors.success },
  emptyTitle:       { color: Colors.white, fontSize: 22, fontWeight: '700' },
  emptyBody:        { color: Colors.textSecondary, fontSize: 14 },

  // Appoint modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { color: Colors.white, fontSize: 18, fontWeight: '800' },
  modalClose:  { color: Colors.textSecondary, fontSize: 20, paddingHorizontal: 4 },
  modalLoading: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  noOperatorsText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', padding: 16 },
  manageBtn: { marginTop: 10, borderColor: Colors.danger },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  removeBtn: {
    backgroundColor: Colors.danger, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  removeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  operatorList: { flexGrow: 0 },
  operatorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  operatorName:    { color: Colors.white, fontSize: 16, fontWeight: '600' },
  operatorBadge:   { color: Colors.primary, fontSize: 12, marginTop: 2 },
  operatorChevron: { color: Colors.textSecondary, fontSize: 22 },
});
