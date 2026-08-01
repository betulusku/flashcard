import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {OCC_CATS, OCCUPATIONS} from '../../data/occupations';
import {classifyOccupation} from '../../logic/occupationClassifier';
import {OccupationCategory} from '../../types/onboarding';
import {colors, radius, spacing} from '../../theme';

type Props = {onSelect: (category: OccupationCategory, title: string) => void; onType: (category: OccupationCategory | null, text: string) => void; value: string | null};
export function OccupationPicker({onSelect, onType, value}: Props) {
  const [search, setSearch] = useState('');
  const [freeText, setFreeText] = useState(value ?? '');
  const filtered = useMemo(() => OCCUPATIONS.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const grouped = useMemo(() => (Object.keys(OCC_CATS) as OccupationCategory[]).map(category => ({category, items: filtered.filter(item => item.category === category)})).filter(group => group.items.length), [filtered]);
  const updateSearch = (text: string) => {
    setSearch(text);
    setFreeText(text);
    onType(classifyOccupation(text), text);
  };
  const selectedTitle = value ?? (freeText.trim() || null);
  const selectedCategory = selectedTitle ? classifyOccupation(selectedTitle) : null;
  return <View style={styles.container}>
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput value={search} onChangeText={updateSearch} placeholder="Search or type your role" placeholderTextColor={colors.muted} style={styles.input} />
    </View>
    {selectedTitle ? <View style={styles.selectedRole}>
      <View><Text style={styles.selectedTitle}>{selectedTitle}</Text><Text style={styles.selectedSub}>Personalized for {OCC_CATS[selectedCategory ?? 'other'].label}</Text></View>
      <Text style={styles.selectedCheck}>✓</Text>
    </View> : <Text style={styles.helper}>Choose the role that best fits what you do.</Text>}
    <ScrollView style={styles.list} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>{grouped.map(group => <View key={group.category}><Text style={styles.header}>{OCC_CATS[group.category].label}</Text>{group.items.map(item => <Pressable key={item.title} accessibilityRole="button" style={[styles.item, value === item.title && styles.itemActive]} onPress={() => {setSearch(''); setFreeText(item.title); onSelect(item.category, item.title);}}><Text style={[styles.itemText, value === item.title && styles.itemSelected]}>{item.title}</Text><Text style={[styles.itemChevron, value === item.title && styles.itemSelected]}>{value === item.title ? '✓' : '›'}</Text></Pressable>)}</View>)}</ScrollView>
  </View>;
}
const styles = StyleSheet.create({container: {flex: 1, gap: spacing.md}, searchWrap: {height: 58, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, backgroundColor: '#171B21', paddingHorizontal: spacing.md}, searchIcon: {color: colors.mint, fontSize: 25, marginRight: 10}, input: {flex: 1, color: colors.text, fontSize: 17}, helper: {color: colors.muted, fontSize: 14, marginTop: 2}, selectedRole: {minHeight: 78, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, selectedTitle: {color: colors.primaryText, fontSize: 18, fontWeight: '700'}, selectedSub: {color: 'rgba(9,36,126,.72)', fontSize: 13, marginTop: 4}, selectedCheck: {color: colors.primaryText, fontSize: 27, fontWeight: '700'}, list: {flex: 1}, header: {color: colors.muted, fontWeight: '700', letterSpacing: 1.5, marginTop: spacing.sm, marginBottom: spacing.xs, fontSize: 12}, item: {minHeight: 56, borderBottomWidth: 1, borderColor: 'rgba(202,239,255,.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, itemActive: {opacity: .55}, itemText: {color: colors.text, fontSize: 17}, itemSelected: {color: colors.mint, fontWeight: '700'}, itemChevron: {color: colors.mint, fontSize: 23}});
