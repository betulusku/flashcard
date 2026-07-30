import React, {useMemo, useState} from 'react';
import {Button, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {OCC_CATS, OCCUPATIONS} from '../../data/occupations';
import {classifyOccupation} from '../../logic/occupationClassifier';
import {OccupationCategory} from '../../types/onboarding';
import {colors, spacing} from '../../theme';

type Props = {onSelect: (category: OccupationCategory, title: string) => void; onType: (category: OccupationCategory | null, text: string) => void; value: string | null};
export function OccupationPicker({onSelect, onType, value}: Props) {
  const [search, setSearch] = useState('');
  const [freeText, setFreeText] = useState(value ?? '');
  const filtered = useMemo(() => OCCUPATIONS.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const grouped = useMemo(() => (Object.keys(OCC_CATS) as OccupationCategory[]).map(category => ({category, items: filtered.filter(item => item.category === category)})).filter(group => group.items.length), [filtered]);
  const updateFreeText = (text: string) => { setFreeText(text); onType(classifyOccupation(text), text); };
  return <View style={styles.container}><TextInput value={search} onChangeText={setSearch} placeholder="Search occupations" style={styles.input} /><TextInput value={freeText} onChangeText={updateFreeText} placeholder="Not listed? Type your own role…" style={styles.input} />
    {freeText.trim() ? <Text>We'll tailor vocabulary for {OCC_CATS[classifyOccupation(freeText) ?? 'other'].label}</Text> : null}
    <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">{grouped.map(group => <View key={group.category}><Text style={styles.header}>{OCC_CATS[group.category].label}</Text>{group.items.map(item => <Button key={item.title} title={item.title} onPress={() => {setFreeText(''); onSelect(item.category, item.title);}} />)}</View>)}</ScrollView>
  </View>;
}
const styles = StyleSheet.create({container: {flex: 1, gap: spacing.sm}, input: {borderWidth: 1, borderColor: colors.border, padding: spacing.sm, borderRadius: 6}, list: {flex: 1}, header: {fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs}});
