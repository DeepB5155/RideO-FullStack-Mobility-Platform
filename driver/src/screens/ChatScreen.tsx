import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';
import api from '../api/axios';

const ChatScreen = ({ route, navigation }: any) => {
  const { bookingId, targetName } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    let hubConnection: signalR.HubConnection;

    const connectChat = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        const hubUrl = SIGNALR_HUB_URL || 'http://192.168.1.182:5248/rideHub';
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token || '' })
          .withAutomaticReconnect()
          .build();

        hubConnection.on('ReceiveMessage', (msg: any) => {
          if (msg.bookingId === bookingId) {
            setMessages(prev => [...prev, msg]);
          }
        });

        await hubConnection.start();
        await hubConnection.invoke('JoinBookingGroup', bookingId);
        
        setConnection(hubConnection);
      } catch (err) {
        console.error('Chat Connection Error', err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/${bookingId}`);
        setMessages(res.data);
      } catch (err) {
        console.log('No chat history found or error fetching');
      }
    };

    connectChat();
    fetchHistory();

    return () => {
      if (hubConnection) {
        hubConnection.invoke('LeaveBookingGroup', bookingId).catch(console.log);
        hubConnection.stop();
      }
    };
  }, [bookingId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !connection) return;

    try {
      await connection.invoke('SendMessage', bookingId, newMessage);
      setNewMessage('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  const renderItem = ({ item }: any) => {
    const isMine = item.isFromDriver; // In driver app, if from driver, it's mine
    return (
      <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>{item.content}</Text>
        <Text style={[styles.timestamp, !isMine && {color: theme.colors.text.muted}]}>{new Date(item.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{targetName}</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.text.muted}
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.main,
  },
  listContainer: {
    padding: theme.spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 0,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 15,
  },
  myText: {
    color: theme.colors.text.light,
  },
  theirText: {
    color: theme.colors.text.main,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.text.main,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sendBtnText: {
    color: theme.colors.text.light,
    fontWeight: '700',
  }
});

export default ChatScreen;
