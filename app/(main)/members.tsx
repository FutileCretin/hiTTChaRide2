// Member List — visible to shop stewards and admin
// Shows all approved operators with options to remove or hand over shop steward role

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
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { createAppointment } from '../../services/stewardAppointment';

interface Member {
  badgeNumber: string;
  name: string;
  isShopSteward: boolean;
  isAdmin?: boolean;
  status: string;
}

export default function MembersScreen() {
  const { profile } = useAuth();
  const [members, setMembers]       = useState<Member[]>([]);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('status', '==', 'approved'))
      );
      const list: Member[] = snap.docs
        .map((d) => d.data() as Member)
        .filter((u) => u.badgeNumber !== profile?.badgeNumber) // don't show yourself
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);
    } catch {
      Alert.alert('Error', 'Could not load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const confirmRemove = (member: Member) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.name} (Badge #${member.badgeNumber})? They will not be able to log in until re-approved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => doRemove(member.badgeNumber) },
      ]
    );
  };

  const doRemove = async (badgeNumber: string) => {
    setProcessing(badgeNumber);
    try {
      await updateDoc(doc(db, 'users', badgeNumber), { status: 'pending' });
      setMembers((prev) => prev.filter((m) => m.badgeNumber !== badgeNumber));
    } catch {
      Alert.alert('Error', 'Could not remove member.');
    } finally {
      setProcessing(null);
    }
  };

  const confirmHandOver = (member: Member) => {
    Alert.alert(
      'Hand Over Shop Steward',
      `Appoint ${member.name} (Badge #${member.badgeNumber}) as the new Shop Steward? You will step down from the role.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hand Over', onPress: () => doHandOver(member) },
      ]
    );
  };

  const doHandOver = async (member: Member) => {
    if (!profile) return;
    setProcessing(member.badgeNumber);
    try {
      await createAppointment(
        member.badgeNumber,
        member.name,
        profile.badgeNumber,
        profile.name,
        profile.isShopSteward ? profile.badgeNumber : null,
        profile.isShopSteward ? profile.name : null,
      );
      Alert.alert('Appointment Sent', `${member.name} will see a notification to accept or decline the role.`);
    } catch {
      Alert.alert('Error', 'Could not send appointment.');
    } finally {
      setProcessing(null);
    }
  };

  const renderItem = ({ item }: { item: Member }) => (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowBadge}>Badge #{item.badgeNumber}</Text>
        {item.isShopSteward && (
          <Text style={styles.rowSteward}>🎖 Shop Steward</Text>
        )}
      </View>
      <View style={styles.rowActions}>
        {!item.isShopSteward && !item.isAdmin && (
          <TouchableOpacity
            style={[styles.handOverBtn, processing === item.badgeNumber && styles.btnDisabled]}
            onPress={() => confirmHandOver(item)}
            disabled={processing !== null}
          >
            {processing === item.badgeNumber
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.handOverBtnText}>🎖</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.removeBtn, processing === item.badgeNumber && styles.btnDisabled]}
          onPress={() => confirmRemove(item)}
          disabled={processing !== null}
        >
          {processing === item.badgeNumber
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.removeBtnText}>Remove</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Member List</Text>
        {!loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{members.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No members yet</Text>
          <Text style={styles.emptyBody}>Approved operators will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={members}
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
  countText:   { color: Colors.white, fontWeight: '700', fontSize: 14 },
  list:        { padding: 20, gap: 12 },
  row: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  rowInfo:     { flex: 1, gap: 3 },
  rowName:     { color: Colors.white, fontSize: 17, fontWeight: '700' },
  rowBadge:    { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  rowSteward:  { color: Colors.accent ?? '#F59E0B', fontSize: 12, marginTop: 4 },
  rowActions:  { flexDirection: 'row', gap: 8 },
  handOverBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  handOverBtnText: { fontSize: 16 },
  removeBtn: {
    backgroundColor: Colors.grayDark, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.danger,
  },
  removeBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
  btnDisabled:   { opacity: 0.5 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { color: Colors.textSecondary, fontSize: 14 },
  emptyContainer:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:        { fontSize: 56 },
  emptyTitle:       { color: Colors.white, fontSize: 22, fontWeight: '700' },
  emptyBody:        { color: Colors.textSecondary, fontSize: 14 },
});
