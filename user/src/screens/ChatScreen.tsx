import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, SafeAreaView, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const localColors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#006a61',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerLowest: '#ffffff',
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
};

const ChatScreen = ({ route, navigation }: any) => {
  const { bookingId, targetName } = route.params || { bookingId: 'mock-booking', targetName: 'Marcus' };
  
  const [messages, setMessages] = useState<any[]>([
    { id: '1', content: "Hi, I'm waiting outside the main entrance.", isFromDriver: true, sentAt: new Date(Date.now() - 120000).toISOString() },
    { id: '2', content: "Great, I'm heading down now. Be there in a minute!", isFromDriver: false, sentAt: new Date(Date.now() - 60000).toISOString() },
    { id: '3', content: "Take your time. I'm parked next to the blue hydrant.", isFromDriver: true, sentAt: new Date(Date.now() - 30000).toISOString() }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let hubConnection: signalR.HubConnection;

    const connectChat = async () => {
      try {
        const token = await AsyncStorage.getItem('jwtToken');
        
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB_URL || 'http://192.168.1.182:5248/ridehub', {
            accessTokenFactory: () => token || ''
          })
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
        if (res.data && res.data.length > 0) {
           setMessages(res.data);
        }
      } catch (err) {
        console.log('No chat history found or error fetching, using mock');
      }
    };

    if (bookingId !== 'mock-booking') {
       connectChat();
       fetchHistory();
    }

    return () => {
      if (hubConnection) {
        hubConnection.invoke('LeaveChat', bookingId).catch(console.log);
        hubConnection.stop();
      }
    };
  }, [bookingId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (connection && bookingId !== 'mock-booking') {
      try {
        await connection.invoke('SendMessage', bookingId, newMessage);
      } catch (err) {
        Alert.alert('Error', 'Failed to send message.');
        return;
      }
    } else {
      // Mock sending
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: newMessage,
        isFromDriver: false,
        sentAt: new Date().toISOString()
      }]);
    }
    
    setNewMessage('');
    setTimeout(() => {
       flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  const sendQuickReply = (reply: string) => {
    setNewMessage(reply);
    // Optional: auto-send
    // setTimeout(sendMessage, 100); 
  };

  const renderItem = ({ item }: any) => {
    const isMine = !item.isFromDriver; 
    const timeString = new Date(item.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if (isMine) {
      return (
        <View style={styles.myMessageWrapper}>
          <View style={styles.myBubble}>
            <Text style={styles.myText}>{item.content}</Text>
          </View>
          <View style={styles.myTimeRow}>
            <Text style={styles.timestamp}>{timeString}</Text>
            <MaterialIcons name="done-all" size={14} color={localColors.secondary} />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.theirMessageWrapper}>
          <View style={styles.theirBubble}>
            <Text style={styles.theirText}>{item.content}</Text>
          </View>
          <Text style={styles.timestampLeft}>{timeString}</Text>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <MaterialIcons name="arrow-back" size={24} color={localColors.onSurface} />
            </TouchableOpacity>
            
            <View style={styles.driverInfoRow}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrR3JkgxLQoWzePBwHDX8Q_415lviQY1OKEPYjweY4xcm8qGJtANzQNyGLMsoyP0X_8_1Z2gE1IryRIp2MdgQNxzXK_CR-1MSGe9vsoxq1UbH80-6pVxhMYTv8MxBo7yzNJjRsIGZBk-dNprlT1HOry-dqXHgG_Xzo4rVbEFIQ0ur7DG9fSFko2nwCsMb7jJC-CoR6qKXVEbnllf-hQ58WXJSx-hsO7uABhIlW0aJiYzovwePWpyq0guVxjvzOIalfAtfdpSnZHzz-' }} 
                  style={styles.avatar} 
                />
                <View style={styles.onlineDot} />
              </View>
              
              <View>
                <Text style={styles.driverName}>{targetName}</Text>
                <View style={styles.carInfoRow}>
                  <Text style={styles.carText}>Honda Civic</Text>
                  <View style={styles.dotSeparator} />
                  <Text style={styles.etaText}>2 min away</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="phone" size={24} color={localColors.onSurface} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.chatArea}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>Today</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ height: 20 }} /> // scroll padding
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      <SafeAreaView style={styles.inputAreaSafe}>
        <View style={styles.inputArea}>
          
          {/* Quick Replies */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRepliesScroll} contentContainerStyle={styles.quickRepliesContent}>
            {["I'm here", "Be right there", "Where are you?"].map((reply, index) => (
              <TouchableOpacity key={index} style={styles.quickReplyBtn} onPress={() => sendQuickReply(reply)}>
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Text Input Row */}
          <View style={styles.inputRow}>
            <View style={styles.textInputWrapper}>
              <TouchableOpacity style={styles.addBtn}>
                <MaterialIcons name="add-circle" size={24} color={localColors.onSurfaceVariant} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="rgba(69, 70, 77, 0.7)"
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={sendMessage}
              />
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <MaterialIcons name="send" size={20} color={localColors.onPrimary} />
            </TouchableOpacity>
          </View>
          
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.surfaceContainerLowest,
  },
  headerSafe: {
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.3)',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: localColors.surfaceContainerHigh,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: localColors.secondary,
    borderWidth: 2,
    borderColor: localColors.surface,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    lineHeight: 22,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: localColors.outlineVariant,
    marginHorizontal: 4,
  },
  etaText: {
    fontSize: 12,
    color: localColors.secondary,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
    backgroundColor: localColors.surfaceContainerLowest,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateDivider: {
    alignSelf: 'center',
    backgroundColor: localColors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  dateDividerText: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    fontWeight: '500',
  },
  theirMessageWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginBottom: 12,
  },
  theirBubble: {
    backgroundColor: localColors.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  theirText: {
    fontSize: 16,
    color: localColors.onSurface,
    lineHeight: 24,
  },
  timestampLeft: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    opacity: 0.7,
    marginTop: 4,
    marginLeft: 4,
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginBottom: 12,
  },
  myBubble: {
    backgroundColor: localColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  myText: {
    fontSize: 16,
    color: localColors.onPrimary,
    lineHeight: 24,
  },
  myTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
    marginRight: 4,
  },
  timestamp: {
    fontSize: 12,
    color: localColors.onSurfaceVariant,
    opacity: 0.7,
  },
  inputAreaSafe: {
    backgroundColor: localColors.surface,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.3)',
    backgroundColor: localColors.surface,
  },
  quickRepliesScroll: {
    marginBottom: 12,
  },
  quickRepliesContent: {
    gap: 8,
    paddingRight: 16,
  },
  quickReplyBtn: {
    backgroundColor: localColors.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
  },
  quickReplyText: {
    fontSize: 12,
    color: localColors.onSurface,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 24,
    paddingLeft: 4,
    paddingRight: 16,
  },
  addBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: localColors.onSurface,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: localColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ChatScreen;
