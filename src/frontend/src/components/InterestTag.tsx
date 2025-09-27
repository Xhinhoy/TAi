import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';


type Props = { label: string; selected?: boolean; onPress?: () => void; };
export default function InterestTag({ label, selected, onPress }: Props) {
return (
<Pressable onPress={onPress} style={[styles.tag, selected && styles.tagSelected]}>
<Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
</Pressable>
);
}
const styles = StyleSheet.create({
tag: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', margin: 6 },
tagSelected: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
text: { color: '#111827', fontSize: 14 },
textSelected: { color: '#1d4ed8', fontWeight: '600' },
});