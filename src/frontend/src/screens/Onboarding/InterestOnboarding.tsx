import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, Alert, ActivityIndicator } from 'react-native';
import InterestTile from '../../components/InterestTile';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';

const INTERESTS = [
  { id: 'museos', label: 'Museos' },
  { id: 'restaurantes', label: 'Restaurantes' },
  { id: 'parques', label: 'Parques' },
  { id: 'miradores', label: 'Miradores' },
  { id: 'senderismo', label: 'Senderismo' },
  { id: 'vida-nocturna', label: 'Vida nocturna' },
  { id: 'bares', label: 'Bares' },
  { id: 'playa', label: 'Playas' },
  { id: 'historia', label: 'Historia' },
  { id: 'arte-urbano', label: 'Arte urbano' },
  { id: 'compras', label: 'Compras' },
  { id: 'deportes', label: 'Deportes' },
];

export default function InterestOnboarding({ navigation }: any) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const onContinue = async () => {
    if (!user) {
      Alert.alert('Sesión', 'Debes iniciar sesión.');
      return;
    }
    if (selected.length < 3) {
      Alert.alert('Selecciona intereses', 'Elige al menos 3 intereses para continuar.');
      return;
    }
    try {
      setSaving(true);
      // guarda en Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        interests: selected,
        updatedAt: serverTimestamp(),
      });

      // navega al stack autenticado principal
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      console.error('onContinue error:', e);
      Alert.alert('Error', e?.message ?? 'No se pudieron guardar tus intereses.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>¿Qué te interesa?</Text>
        <Text style={styles.subtitle}>
          Elige al menos 3 para personalizar tus itinerarios • Seleccionados: {selected.length}
        </Text>
      </View>

      <FlatList
        data={INTERESTS}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <InterestTile
              label={item.label}
              selected={selected.includes(item.id)}
              onPress={() => toggle(item.id)}
            />
          </View>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={onContinue}
          disabled={saving || selected.length < 3}
          style={[
            styles.btn,
            (saving || selected.length < 3) && styles.btnDisabled
          ]}
        >
          {saving ? <ActivityIndicator /> : <Text style={styles.btnText}>Continuar</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#6b7280' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  btn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
