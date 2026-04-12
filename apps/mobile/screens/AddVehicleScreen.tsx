import { API_URL } from '../lib/config';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';



const CONNECTOR_OPTIONS = [
  { id: 'TYPE1', label: 'Type 1 (J1772)' },
  { id: 'TYPE2', label: 'Type 2 (Mennekes)' },
  { id: 'CCS1', label: 'CCS1' },
  { id: 'CCS2', label: 'CCS2' },
  { id: 'CHADEMO', label: 'CHAdeMO' },
  { id: 'NACS', label: 'NACS (Tesla)' },
];

const POPULAR_EVS = [
  // BYD
  { make: 'BYD', model: 'Atto 3', year: 2024, batteryKwh: 60.5, connectors: ['CCS2'] },
  { make: 'BYD', model: 'Seal', year: 2024, batteryKwh: 82.5, connectors: ['CCS2'] },
  { make: 'BYD', model: 'Han', year: 2024, batteryKwh: 85.4, connectors: ['CCS2'] },
  { make: 'BYD', model: 'Dolphin', year: 2024, batteryKwh: 44.9, connectors: ['CCS2'] },
  { make: 'BYD', model: 'Tang', year: 2024, batteryKwh: 108.8, connectors: ['CCS2'] },
  // Hyundai / Kia
  { make: 'Hyundai', model: 'Ioniq 5', year: 2024, batteryKwh: 77.4, connectors: ['CCS2'] },
  { make: 'Hyundai', model: 'Ioniq 6', year: 2024, batteryKwh: 77.4, connectors: ['CCS2'] },
  { make: 'Kia', model: 'EV6', year: 2024, batteryKwh: 77.4, connectors: ['CCS2'] },
  { make: 'Kia', model: 'EV9', year: 2024, batteryKwh: 99.8, connectors: ['CCS2'] },
  // MG / SAIC
  { make: 'MG', model: 'ZS EV', year: 2024, batteryKwh: 51, connectors: ['CCS2'] },
  { make: 'MG', model: '4', year: 2024, batteryKwh: 64, connectors: ['CCS2'] },
  // Geely / Ora
  { make: 'Geely', model: 'Geometry C', year: 2024, batteryKwh: 70, connectors: ['CCS2'] },
  { make: 'Ora', model: 'Good Cat', year: 2024, batteryKwh: 63, connectors: ['CCS2'] },
  // Tesla
  { make: 'Tesla', model: 'Model 3', year: 2024, batteryKwh: 75, connectors: ['NACS'] },
  { make: 'Tesla', model: 'Model Y', year: 2024, batteryKwh: 75, connectors: ['NACS'] },
  // Nissan
  { make: 'Nissan', model: 'Leaf', year: 2023, batteryKwh: 40, connectors: ['TYPE1', 'CHADEMO'] },
  { make: 'Nissan', model: 'Ariya', year: 2024, batteryKwh: 87, connectors: ['CCS2'] },
  // Others
  { make: 'Volvo', model: 'XC40 Recharge', year: 2024, batteryKwh: 82, connectors: ['CCS2'] },
  { make: 'BMW', model: 'iX', year: 2024, batteryKwh: 111.5, connectors: ['CCS2'] },
  { make: 'Audi', model: 'e-tron', year: 2024, batteryKwh: 95, connectors: ['CCS2'] },
];

export default function AddVehicleScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [batteryKwh, setBatteryKwh] = useState('');
  const [rangKm, setRangKm] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [connectors, setConnectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleConnector(id: string) {
    setConnectors(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function fillFromPreset(preset: typeof POPULAR_EVS[0]) {
    setMake(preset.make);
    setModel(preset.model);
    setYear(String(preset.year));
    setBatteryKwh(String(preset.batteryKwh));
    setConnectors(preset.connectors);
  }

  async function handleAdd() {
    if (!make || !model || !year) { Alert.alert('Required fields', 'Please fill in make, model, and year.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user?.uid, make, model, year, batteryKwh: batteryKwh || 0, rangKm: rangKm || 0, connectors, licensePlate: licensePlate || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      Alert.alert('Vehicle Added!', `${year} ${make} ${model} added to your garage.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not add vehicle.');
    } finally {
      setLoading(false);
    }
  }

  const isPresetActive = (p: typeof POPULAR_EVS[0]) => make === p.make && model === p.model;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>

        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Quick Select (Popular EVs in PH)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          {POPULAR_EVS.map(p => (
            <TouchableOpacity
              key={`${p.make}-${p.model}`}
              style={[
                styles.presetChip,
                { borderColor: t.border },
                isPresetActive(p) && { borderColor: t.green, backgroundColor: t.greenTint },
              ]}
              onPress={() => fillFromPreset(p)}
            >
              <Text style={[styles.presetText, { color: t.textSecondary }, isPresetActive(p) && { color: t.green, fontWeight: '700' }]}>
                {p.make} {p.model}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: t.textSecondary }]}>Make *</Text>
        <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={make} onChangeText={setMake} placeholder="e.g. BYD" placeholderTextColor={t.placeholder} />

        <Text style={[styles.label, { color: t.textSecondary }]}>Model *</Text>
        <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={model} onChangeText={setModel} placeholder="e.g. Atto 3" placeholderTextColor={t.placeholder} />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Year *</Text>
            <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2024" placeholderTextColor={t.placeholder} />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Battery (kWh)</Text>
            <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={batteryKwh} onChangeText={setBatteryKwh} keyboardType="decimal-pad" placeholder="60.5" placeholderTextColor={t.placeholder} />
          </View>
        </View>

        <Text style={[styles.label, { color: t.textSecondary }]}>Range (km)</Text>
        <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={rangKm} onChangeText={setRangKm} keyboardType="decimal-pad" placeholder="400" placeholderTextColor={t.placeholder} />

        <Text style={[styles.label, { color: t.textSecondary }]}>License Plate (optional)</Text>
        <TextInput style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]} value={licensePlate} onChangeText={setLicensePlate} placeholder="ABC 1234" placeholderTextColor={t.placeholder} autoCapitalize="characters" />

        <Text style={[styles.label, { color: t.textSecondary }]}>Connector Types</Text>
        <View style={styles.connectorGrid}>
          {CONNECTOR_OPTIONS.map(c => {
            const active = connectors.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.connectorChip, { borderColor: t.border }, active && { borderColor: t.green, backgroundColor: t.green }]}
                onPress={() => toggleConnector(c.id)}
              >
                {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                <Text style={[styles.connectorText, { color: t.textSecondary }, active && { color: '#fff', fontWeight: '600' }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: t.green }]} onPress={handleAdd} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add Vehicle</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  presetsRow: { marginBottom: 20 },
  presetChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  presetText: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  connectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  connectorChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  connectorText: { fontSize: 13 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
