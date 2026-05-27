import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { getTicketStats } from '../services/api';

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await getTicketStats();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const cards = [
    { label: 'Всего', value: stats?.total || 0, color: '#1677ff' },
    { label: 'Новые', value: stats?.by_status?.new || 0, color: '#1677ff' },
    { label: 'В работе', value: stats?.by_status?.in_progress || 0, color: '#faad14' },
    { label: 'Выполнено', value: stats?.by_status?.completed || 0, color: '#52c41a' },
    { label: 'Закрыто', value: stats?.by_status?.closed || 0, color: '#999' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Панель управления</Text>
      <View style={styles.grid}>
        {cards.map((card, i) => (
          <TouchableOpacity key={i} style={[styles.card, { borderLeftColor: card.color }]}>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Tickets')}>
          <Text style={styles.menuText}>📋 Заявки</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Clients')}>
          <Text style={styles.menuText}>👥 Клиенты</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AI')}>
          <Text style={styles.menuText}>🤖 AI-помощник</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#000' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardValue: { fontSize: 32, fontWeight: 'bold' },
  cardLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  menuSection: { marginTop: 24 },
  menuItem: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuText: { fontSize: 16, fontWeight: '500' },
});

export default DashboardScreen;
