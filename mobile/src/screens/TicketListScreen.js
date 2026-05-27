import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ActivityIndicator,
} from 'react-native';
import { getTickets } from '../services/api';

const statusLabels = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена', closed: 'Закрыта' };
const statusColors = { new: '#1677ff', in_progress: '#faad14', completed: '#52c41a', closed: '#999' };

const TicketListScreen = ({ navigation }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTickets = async (pg = 1) => {
    try {
      const res = await getTickets({ search, page: pg, page_size: 20 });
      if (pg === 1) {
        setTickets(res.data.items);
      } else {
        setTickets(prev => [...prev, ...res.data.items]);
      }
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchTickets(1);
  };

  const loadMore = () => {
    if (tickets.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTickets(nextPage);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TicketDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.ticketNumber}>{item.number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#999' }]}>
          <Text style={styles.statusText}>{statusLabels[item.status] || item.status}</Text>
        </View>
      </View>
      <Text style={styles.clientName}>{item.client_name || 'Без клиента'}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.short_description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Поиск по номеру, ФИО..."
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  search: {
    backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketNumber: { fontSize: 16, fontWeight: 'bold', color: '#1677ff' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 14, color: '#333', marginBottom: 4 },
  description: { fontSize: 13, color: '#666' },
});

export default TicketListScreen;
