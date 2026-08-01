import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {OCC_CATS, OCCUPATIONS} from '../../data/occupations';
import {classifyOccupation} from '../../logic/occupationClassifier';
import {OccupationCategory} from '../../types/onboarding';
import {colors, radius, spacing} from '../../theme';
import {Icon} from '../Icon';

type Props = {onSelect: (category: OccupationCategory, title: string) => void; onClear: () => void; value: string | null};

/**
 * Typing only filters the list. The answer is set when the learner taps a role
 * or confirms their own wording, so the survey never picks for them.
 */
export function OccupationPicker({onSelect, onClear, value}: Props) {
  const [search, setSearch] = useState('');
  const query = search.trim();
  const filtered = useMemo(() => OCCUPATIONS.filter(item => item.title.toLowerCase().includes(query.toLowerCase())), [query]);
  const grouped = useMemo(() => (Object.keys(OCC_CATS) as OccupationCategory[]).map(category => ({category, items: filtered.filter(item => item.category === category)})).filter(group => group.items.length), [filtered]);
  const exactMatch = filtered.some(item => item.title.toLowerCase() === query.toLowerCase());
  const clear = () => {setSearch(''); onClear();};
  const choose = (category: OccupationCategory, title: string) => {setSearch(''); onSelect(category, title);};
  return <View style={styles.container}>
    <View style={styles.searchWrap}>
      <Icon.Search size={20} />
      <TextInput value={search} onChangeText={setSearch} placeholder="Search or type your role" placeholderTextColor={colors.muted} style={styles.input} />
    </View>
    {value ? <View style={styles.selectedRole}>
      <View style={styles.selectedCopy}><Text style={styles.selectedTitle}>{value}</Text><Text style={styles.selectedSub}>Personalized for {OCC_CATS[classifyOccupation(value) ?? 'other'].label}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear selected role" hitSlop={12} onPress={clear}><Icon.Close size={20} color={colors.primaryText} /></Pressable>
    </View> : <Text style={styles.helper}>Choose the role that best fits what you do.</Text>}
    <ScrollView style={styles.list} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
      {query && !exactMatch ? <Pressable accessibilityRole="button" style={styles.custom} onPress={() => choose(classifyOccupation(query) ?? 'other', query)}>
        <Text style={styles.customText}>Use “{query}” as my role</Text><Icon.ChevronRight size={20} />
      </Pressable> : null}
      {grouped.map(group => <View key={group.category}>
        <Text style={styles.header}>{OCC_CATS[group.category].label}</Text>
        {group.items.map(item => <Pressable key={item.title} accessibilityRole="button" style={styles.item} onPress={() => choose(item.category, item.title)}>
          <Text style={[styles.itemText, value === item.title && styles.itemSelected]}>{item.title}</Text>
          {value === item.title ? <Icon.Check size={20} /> : <Icon.ChevronRight size={20} />}
        </Pressable>)}
      </View>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({container: {flex: 1, gap: spacing.md}, searchWrap: {height: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, backgroundColor: '#171B21', paddingHorizontal: spacing.md}, input: {flex: 1, color: colors.text, fontSize: 17}, helper: {color: colors.muted, fontSize: 14, marginTop: 2}, selectedRole: {minHeight: 78, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm}, selectedCopy: {flex: 1}, selectedTitle: {color: colors.primaryText, fontSize: 18, fontWeight: '700'}, selectedSub: {color: 'rgba(9,36,126,.72)', fontSize: 13, marginTop: 4}, list: {flex: 1}, custom: {minHeight: 56, borderBottomWidth: 1, borderColor: 'rgba(202,239,255,.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, customText: {color: colors.mint, fontSize: 17, fontWeight: '600', flex: 1}, header: {color: colors.muted, fontWeight: '700', letterSpacing: 1.5, marginTop: spacing.sm, marginBottom: spacing.xs, fontSize: 12}, item: {minHeight: 56, borderBottomWidth: 1, borderColor: 'rgba(202,239,255,.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, itemText: {color: colors.text, fontSize: 17}, itemSelected: {color: colors.mint, fontWeight: '700'}});
