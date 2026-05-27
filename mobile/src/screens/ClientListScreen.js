import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import { getClients } from '../services/api';

const ClientListScreen = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    try {
      const res = await getClients({ search, page_size: 50 });
      setClients(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [search]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: item.client_type === 'legal' ? '#722ed1' : '#13c2c2' }]}>
          <Text style={styles.typeText}>{item.client_type === 'legal' ? 'Юр.лицо' : 'Физ.лицо'}</Text>
        </View>
      </View>
      <Text style={styles.contact}>{item.phone || '—'}</Text>
      <Text style={styles.contact}>{item.email || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Поиск..."
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={clients}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
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
  clientName: { fontSize: 16, fontWeight: '600', color: '#000' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  contact: { fontSize: 14, color: '#666', marginTop: 2 },
});

export default ClientListScreen;
