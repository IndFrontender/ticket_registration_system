import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import TicketListScreen from './src/screens/TicketListScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import ClientListScreen from './src/screens/ClientListScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AiChatScreen from './src/screens/AiChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TicketStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TicketList" component={TicketListScreen} options={{ title: 'Заявки' }} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Детали заявки' }} />
    </Stack.Navigator>
  );
}

function ClientStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientList" component={ClientListScreen} options={{ title: 'Клиенты' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Дашборд' }} />
          <Tab.Screen name="Tickets" component={TicketStack} options={{ title: 'Заявки' }} />
          <Tab.Screen name="Clients" component={ClientStack} options={{ title: 'Клиенты' }} />
          <Tab.Screen name="AI" component={AiChatScreen} options={{ title: 'AI-помощник' }} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
