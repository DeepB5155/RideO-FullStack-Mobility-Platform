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
      const res = await axiosInstance.get('/safety/emergency-contacts');
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
      const res = await axiosInstance.post('/safety/emergency-contacts', {
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
            await axiosInstance.delete(`/safety/emergency-contacts/${id}`);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  contactCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  contactPhone: { fontSize: 15, color: '#64748b', marginTop: 2 },
  contactRel: { fontSize: 13, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 20, fontStyle: 'italic' },
  addBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  addForm: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginTop: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});

export default EmergencyContactsScreen;
