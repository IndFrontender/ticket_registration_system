import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { getTicket, updateTicket } from '../services/api';

const statusLabels = { new: 'Новая', in_progress: 'В работе', completed: 'Выполнена', closed: 'Закрыта' };
const statusColors = { new: '#1677ff', in_progress: '#faad14', completed: '#52c41a', closed: '#999' };
const priorityLabels = { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' };
const priorityColors = { critical: '#ff4d4f', high: '#fa8c16', medium: '#faad14', low: '#52c41a' };

const TicketDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = async () => {
    try {
      const res = await getTicket(id);
      setTicket(res.data);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить заявку');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const changeStatus = async (status) => {
    try {
      await updateTicket(id, { status });
      fetchTicket();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 100 }} />;
  if (!ticket) return <Text style={styles.errorText}>Заявка не найдена</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.number}>{ticket.number}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[ticket.status] }]}>
          <Text style={styles.badgeText}>{statusLabels[ticket.status]}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: priorityColors[ticket.priority] }]}>
          <Text style={styles.badgeText}>{priorityLabels[ticket.priority]}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.label}>Кратко:</Text>
        <Text style={styles.value}>{ticket.short_description}</Text>
        {ticket.full_description && (
          <>
            <Text style={styles.label}>Подробно:</Text>
            <Text style={styles.value}>{ticket.full_description}</Text>
          </>
        )}
      </View>

      {ticket.client && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <Text style={styles.value}>{ticket.client.name}</Text>
          <Text style={styles.value}>{ticket.client.phone}</Text>
          <Text style={styles.value}>{ticket.client.email}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Действия</Text>
        <View style={styles.actionRow}>
          {ticket.status === 'new' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus('in_progress')}>
              <Text style={styles.actionBtnText}>Взять в работу</Text>
            </TouchableOpacity>
          )}
          {ticket.status === 'in_progress' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#52c41a' }]} onPress={() => changeStatus('completed')}>
              <Text style={styles.actionBtnText}>Завершить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  number: { fontSize: 20, fontWeight: 'bold', color: '#1677ff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  label: { fontSize: 13, color: '#888', marginTop: 8 },
  value: { fontSize: 15, color: '#333' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { backgroundColor: '#1677ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default TicketDetailScreen;
