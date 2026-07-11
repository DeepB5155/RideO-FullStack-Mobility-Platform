import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const ChatScreen = ({ route, navigation }: any) => {
  const { bookingId, targetName } = route.params || { bookingId: 'mock-1', targetName: 'Chat' };
  const { user } = useContext(AuthContext);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  const QUICK_REPLIES = ["I'm here", "Stuck in traffic", "Be right there"];

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
        await hubConnection.invoke('JoinChat', bookingId);
        
        setConnection(hubConnection);
      } catch (err) {
        console.error('Chat Connection Error', err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/${bookingId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.log('No chat history found or error fetching');
      }
    };

    connectChat();
    fetchHistory();

    return () => {
      if (hubConnection) {
        hubConnection.invoke('LeaveChat', bookingId).catch(console.log);
        hubConnection.stop();
      }
    };
  }, [bookingId]);

  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    setNewMessage('');

    if (!connection) return;

    try {
      await connection.invoke('SendMessage', bookingId, text);
    } catch (err) {
      console.log('Failed to send message to server.');
    }
  };

  const renderItem = ({ item }: any) => {
    const isMine = item.senderId === user?.id;
    const time = new Date(item.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    if (isMine) {
      return (
        <View style={styles.myMessageContainer}>
          <View style={styles.myBubble}>
            <Text style={styles.myText}>{item.content}</Text>
          </View>
          <View style={styles.myTimeRow}>
            <Text style={styles.timeText}>{time}</Text>
            <MaterialIcon name="done-all" size={14} color="#006a61" style={{ marginLeft: 4 }} />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.theirMessageContainer}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/100?img=5' }} 
            style={styles.avatar}
          />
          <View style={styles.theirContent}>
            <View style={styles.theirBubble}>
              <Text style={styles.theirText}>{item.content}</Text>
            </View>
            <Text style={styles.timeTextLeft}>{time}</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{targetName}</Text>
            <Text style={styles.headerSubtitle}>Pickup in 4 min • 0.8 mi</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcon name="phone" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={() => (
            <View style={styles.systemMessageContainer}>
              <View style={styles.systemPill}>
                <Text style={styles.systemText}>Trip accepted at 10:42 AM</Text>
              </View>
            </View>
          )}
        />

        {/* Quick Replies */}
        <View style={styles.quickRepliesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
            {QUICK_REPLIES.map((reply, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.quickReplyBtn}
                onPress={() => sendTextMessage(reply)}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <MaterialIcon name="add-circle-outline" size={26} color="#76777d" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#76777d"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={() => sendTextMessage(newMessage)}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendTextMessage(newMessage)}>
            <MaterialIcon name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.3)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
    marginTop: 2,
  },
  iconBtn: {
    padding: 12,
  },

  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemPill: {
    backgroundColor: '#dce9ff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
  },
  systemText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#45464d',
  },

  // My Message (Driver)
  myMessageContainer: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  myBubble: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  myText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  myTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 8,
  },

  // Their Message (Passenger)
  theirMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#e5eeff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  theirContent: {
    flex: 1,
  },
  theirBubble: {
    backgroundColor: '#e5eeff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.3)',
  },
  theirText: {
    fontSize: 16,
    color: '#0b1c30',
    lineHeight: 24,
  },
  timeTextLeft: {
    fontSize: 12,
    color: '#45464d',
    marginTop: 4,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#45464d',
  },

  // Quick Replies
  quickRepliesContainer: {
    backgroundColor: '#f8f9ff',
    paddingTop: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  quickReplyBtn: {
    backgroundColor: '#dce9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0b1c30',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f9ff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,205,0.2)',
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
  },
  attachBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#eff4ff',
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0b1c30',
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default ChatScreen;
