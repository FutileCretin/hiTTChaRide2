// In-app Pending Approvals screen — visible to shop stewards only
// Same logic as the admin web app but inside the mobile app

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors } from '../../constants/colors';

interface PendingUser {
  badgeNumber: string;
  name: string;
  registeredAt: Timestamp;
  deviceChangedAt?: Timestamp;
}

export default function ApprovalsScreen() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

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
    const action = approve ? 'approve' : 'deny';
    Alert.alert(
      `${approve ? 'Approve' : 'Deny'} Operator`,
      `Are you sure you want to ${action} ${user.name} (Badge #${user.badgeNumber})?`,
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
    } catch (e) {
      Alert.alert('Error', 'Could not process this request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (ts: Timestamp) => {
    const d = ts.toDate();
    return d.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: PendingUser }) => (
    <View style={styles.row}>
      {/* Badge + Name + Date */}
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

      {/* Approve / Deny buttons */}
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.approveBtn, processing === item.badgeNumber && styles.btnDisabled]}
          onPress={() => handleDecision(item, true)}
          disabled={processing === item.badgeNumber}
        >
          {processing === item.badgeNumber ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.approveBtnText}>Approve</Text>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  rowInfo: {
    gap: 3,
  },
  rowBadge: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  rowName: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  rowDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowWarning: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  approveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  denyBtn: {
    flex: 1,
    backgroundColor: Colors.grayDark,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  denyBtnText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 56,
    color: Colors.success,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
