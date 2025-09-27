import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';


type Props = { label: string; uri?: string; selected?: boolean; onPress?: () => void };
export default function InterestTile({ label, uri, selected, onPress }: Props) {
return (
<Pressable onPress={onPress} style={[styles.card, selected && styles.cardSelected]}>
{uri ? (
<Image source={{ uri }} style={styles.img} />
) : (
<View style={[styles.img, styles.placeholder]} />
)}
<View style={styles.footer}>
<Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
</View>
</Pressable>
);
}
const styles = StyleSheet.create({
card: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
cardSelected: { borderColor: '#2563eb' },
img: { width: '100%', height: 110 },
placeholder: { backgroundColor: '#f3f4f6' },
footer: { padding: 10 },
text: { fontSize: 14, color: '#111827' },
textSelected: { color: '#1d4ed8', fontWeight: '600' },
});