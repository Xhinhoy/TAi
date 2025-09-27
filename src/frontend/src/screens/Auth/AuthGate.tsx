import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ensureUserProfile } from '../../utils/profile';

export default function AuthGate({ navigation }: any) {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        setBooted(true);
        return;
      }

      // 1) Crear/normalizar perfil
      await ensureUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        language: 'es',
        location: 'Santiago',
        timezone: 'America/Santiago',
      });

      // 2) Leer una sola vez y decidir ruta
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};
      const hasInterests = Array.isArray(data.interests) && data.interests.length > 0;

      navigation.reset({
        index: 0,
        routes: [{ name: hasInterests ? 'MainTabs' : 'InterestOnboarding' }],
      });
      setBooted(true);
    });

    return () => unsubAuth();
  }, [navigation]);

  if (!booted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return null;
}
