import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axiosInstance from '../api/axios';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string | null;
}

const EmergencyContactsScreen = ({ navigation }: any) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await axiosInstance.get('/emergency/contacts');
      setContacts(res.data);
    } catch (e: any) {
      console.log('Failed to fetch emergency contacts', e);
      Alert.alert('Error', 'Failed to load emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!name || !phone) {
      Alert.alert('Validation', 'Name and Phone Number are required.');
      return;
    }

    if (contacts.length >= 3) {
      Alert.alert('Limit Reached', 'You can only have up to 3 emergency contacts.');
      return;
    }

    try {
      const res = await axiosInstance.post('/emergency/contacts', {
        name,
        phoneNumber: phone,
        relationship
      });
      setContacts([...contacts, res.data.contact]);
      setName('');
      setPhone('');
      setRelationship('');
      setIsAdding(false);
      Alert.alert('Success', 'Emergency contact added.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add contact.');
    }
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/emergency/contacts/${id}`);
            setContacts(contacts.filter(c => c.id !== id));
          } catch(e) {
            Alert.alert('Error', 'Failed to remove contact.');
          }
        }
      }
    ]);
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        {item.relationship && <Text style={styles.contactRel}>{item.relationship}</Text>}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteContact(item.id)}>
        <Text style={styles.deleteBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>&larr; Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Emergency Contacts</Text>
      <Text style={styles.subtitle}>Add up to 3 trusted contacts who will be notified in an emergency.</Text>
      <Text style={styles.hintText}>💡 Your contacts will be notified with your location if you press SOS during a ride</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          ListEmptyComponent={<Text style={styles.emptyText}>No emergency contacts added yet.</Text>}
        />
      )}

      {isAdding ? (
        <View style={styles.addForm}>
          <Text style={styles.formTitle}>Add New Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Mom)"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship (Optional)"
            value={relationship}
            onChangeText={setRelationship}
          />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddContact}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        contacts.length < 3 && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
            <Text style={styles.addBtnText}>+ Add Emergency Contact</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
};

import { theme } from '../theme/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text.main, marginBottom: 5 },
  subtitle: { fontSize: 14, color: theme.colors.text.muted, marginBottom: 10 },
  hintText: { fontSize: 14, color: theme.colors.success, marginBottom: 20, fontStyle: 'italic', backgroundColor: theme.colors.success + '15', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.success },
  contactCard: { backgroundColor: theme.colors.card, padding: 15, borderRadius: theme.radius.lg, flexDirection: 'row', alignItems: 'center', marginBottom: 10, ...theme.shadows.small, borderWidth: 1, borderColor: theme.colors.border },
  contactName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  contactPhone: { fontSize: 15, color: theme.colors.text.muted, marginTop: 2 },
  contactRel: { fontSize: 13, color: theme.colors.text.muted, marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.danger },
  deleteBtnText: { color: theme.colors.danger, fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: theme.colors.text.muted, marginTop: 20, fontStyle: 'italic' },
  addBtn: { backgroundColor: theme.colors.primary, padding: 15, borderRadius: theme.radius.md, alignItems: 'center', marginTop: 20 },
  addBtnText: { color: theme.colors.text.light, fontWeight: 'bold', fontSize: 16 },
  addForm: { backgroundColor: theme.colors.card, padding: 20, borderRadius: theme.radius.lg, marginTop: 20, ...theme.shadows.medium, borderWidth: 1, borderColor: theme.colors.border },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  input: { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16, color: theme.colors.text.main, borderWidth: 1, borderColor: theme.colors.border },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.surface, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelBtnText: { color: theme.colors.text.main, fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.success, alignItems: 'center' },
  saveBtnText: { color: theme.colors.text.light, fontWeight: 'bold' }
});

export default EmergencyContactsScreen;
