// Waze-style avatar — circle face with hat or hair style options

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import Svg, { Circle, Ellipse, Rect, G, Path } from 'react-native-svg';
import { AvatarConfig, AvatarStyle } from '../services/vehicleBroadcast';
import { Colors } from '../constants/colors';

interface AvatarProps {
  config: AvatarConfig;
  size?: number;
}

const CX = 40;
const FACE_CY = 54;
const FACE_R = 26;  // larger, more circular
const FACE_TOP = FACE_CY - FACE_R; // = 28

export function Avatar({ config, size = 80 }: AvatarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <StyleShape style={config.style} skinTone={config.skinTone} />
      {/* Circle face — always on top of hat brim, below hair */}
      <Circle cx={CX} cy={FACE_CY} r={FACE_R} fill={config.skinTone} />
      {/* Hair goes over face for realism */}
      <HairOverlay style={config.style} skinTone={config.skinTone} />
    </Svg>
  );
}

// Draws hats behind the face, or hair base behind face
function StyleShape({ style, skinTone }: { style: AvatarStyle; skinTone: string }) {
  switch (style) {
    case 'conductor':
      return (
        <G>
          {/* Hat dome */}
          <Ellipse cx={CX} cy={FACE_TOP - 7} rx={18} ry={12} fill="#1a1a2e" />
          {/* Brim */}
          <Rect x={CX - 23} y={FACE_TOP + 1} width={46} height={5} rx={2.5} fill="#2a2a4e" />
          {/* Red band */}
          <Rect x={CX - 18} y={FACE_TOP - 2} width={36} height={4} rx={2} fill="#E31837" />
        </G>
      );

    case 'baseball':
      return (
        <G>
          {/* Cap dome */}
          <Path
            d={`M ${CX - 16} ${FACE_TOP + 2} Q ${CX - 16} ${FACE_TOP - 16} ${CX} ${FACE_TOP - 18} Q ${CX + 16} ${FACE_TOP - 16} ${CX + 16} ${FACE_TOP + 2} Z`}
            fill="#E31837"
          />
          {/* Brim sticking out to the right */}
          <Path
            d={`M ${CX - 14} ${FACE_TOP + 3} Q ${CX + 2} ${FACE_TOP + 11} ${CX + 24} ${FACE_TOP + 5}`}
            stroke="#B01229"
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />
          {/* Center seam */}
          <Path
            d={`M ${CX} ${FACE_TOP - 18} L ${CX} ${FACE_TOP + 2}`}
            stroke="#B01229"
            strokeWidth={1.5}
            fill="none"
          />
        </G>
      );

    case 'turban':
      return (
        <G>
          {/* Main turban wrap — blue */}
          <Ellipse cx={CX} cy={FACE_TOP - 5} rx={19} ry={13} fill="#1565C0" />
          {/* Wrap detail lines */}
          <Path
            d={`M ${CX - 18} ${FACE_TOP - 3} Q ${CX} ${FACE_TOP - 18} ${CX + 18} ${FACE_TOP - 3}`}
            stroke="#0D47A1"
            strokeWidth={3}
            fill="none"
          />
          <Path
            d={`M ${CX - 16} ${FACE_TOP + 1} Q ${CX} ${FACE_TOP - 11} ${CX + 16} ${FACE_TOP + 1}`}
            stroke="#0D47A1"
            strokeWidth={2}
            fill="none"
          />
          {/* Centre brooch */}
          <Circle cx={CX} cy={FACE_TOP - 7} r={3} fill="#90CAF9" />
        </G>
      );

    case 'conical':
      return (
        <G>
          {/* Cone — triangular rice farm hat */}
          <Path
            d={`M ${CX} ${FACE_TOP - 24} L ${CX - 26} ${FACE_TOP + 5} Q ${CX} ${FACE_TOP + 10} ${CX + 26} ${FACE_TOP + 5} Z`}
            fill="#D4A017"
          />
          {/* Rim */}
          <Ellipse cx={CX} cy={FACE_TOP + 5} rx={26} ry={5} fill="#B8860B" />
          {/* Straw texture */}
          <Path d={`M ${CX} ${FACE_TOP - 24} L ${CX - 14} ${FACE_TOP + 3}`} stroke="#C8940F" strokeWidth={0.8} />
          <Path d={`M ${CX} ${FACE_TOP - 24} L ${CX + 14} ${FACE_TOP + 3}`} stroke="#C8940F" strokeWidth={0.8} />
          <Path d={`M ${CX} ${FACE_TOP - 24} L ${CX - 7} ${FACE_TOP + 2}`} stroke="#C8940F" strokeWidth={0.8} />
          <Path d={`M ${CX} ${FACE_TOP - 24} L ${CX + 7} ${FACE_TOP + 2}`} stroke="#C8940F" strokeWidth={0.8} />
        </G>
      );

    case 'hair_blonde':
      return (
        <G>
          {/* Blonde hair — drawn behind face */}
          {/* Top/side hair */}
          <Ellipse cx={CX} cy={FACE_TOP - 2} rx={22} ry={14} fill="#F5D020" />
          {/* Long flowing sides */}
          <Path
            d={`M ${CX - 20} ${FACE_TOP + 6} Q ${CX - 28} ${FACE_CY + 10} ${CX - 22} ${FACE_CY + 26}`}
            stroke="#F5D020" strokeWidth={12} fill="none" strokeLinecap="round"
          />
          <Path
            d={`M ${CX + 20} ${FACE_TOP + 6} Q ${CX + 28} ${FACE_CY + 10} ${CX + 22} ${FACE_CY + 26}`}
            stroke="#F5D020" strokeWidth={12} fill="none" strokeLinecap="round"
          />
        </G>
      );

    case 'hair_black':
      return (
        <G>
          <Ellipse cx={CX} cy={FACE_TOP - 2} rx={22} ry={14} fill="#1a1a1a" />
          <Path
            d={`M ${CX - 20} ${FACE_TOP + 6} Q ${CX - 28} ${FACE_CY + 10} ${CX - 22} ${FACE_CY + 26}`}
            stroke="#1a1a1a" strokeWidth={12} fill="none" strokeLinecap="round"
          />
          <Path
            d={`M ${CX + 20} ${FACE_TOP + 6} Q ${CX + 28} ${FACE_CY + 10} ${CX + 22} ${FACE_CY + 26}`}
            stroke="#1a1a1a" strokeWidth={12} fill="none" strokeLinecap="round"
          />
        </G>
      );

    case 'hair_brown':
      return (
        <G>
          <Ellipse cx={CX} cy={FACE_TOP - 2} rx={22} ry={14} fill="#6B3A2A" />
          <Path
            d={`M ${CX - 20} ${FACE_TOP + 6} Q ${CX - 28} ${FACE_CY + 10} ${CX - 22} ${FACE_CY + 26}`}
            stroke="#6B3A2A" strokeWidth={12} fill="none" strokeLinecap="round"
          />
          <Path
            d={`M ${CX + 20} ${FACE_TOP + 6} Q ${CX + 28} ${FACE_CY + 10} ${CX + 22} ${FACE_CY + 26}`}
            stroke="#6B3A2A" strokeWidth={12} fill="none" strokeLinecap="round"
          />
        </G>
      );

    default:
      return null;
  }
}

// Hair overlay drawn ON TOP of face circle (hairline effect)
function HairOverlay({ style }: { style: AvatarStyle; skinTone: string }) {
  if (style === 'hair_blonde') {
    return (
      <G>
        {/* Hair top covering top of circle */}
        <Path
          d={`M ${CX - 20} ${FACE_TOP + 4} Q ${CX - 20} ${FACE_TOP - 4} ${CX} ${FACE_TOP - 3} Q ${CX + 20} ${FACE_TOP - 4} ${CX + 20} ${FACE_TOP + 4}`}
          fill="#F5D020"
        />
      </G>
    );
  }
  if (style === 'hair_black') {
    return (
      <G>
        <Path
          d={`M ${CX - 20} ${FACE_TOP + 4} Q ${CX - 20} ${FACE_TOP - 4} ${CX} ${FACE_TOP - 3} Q ${CX + 20} ${FACE_TOP - 4} ${CX + 20} ${FACE_TOP + 4}`}
          fill="#1a1a1a"
        />
      </G>
    );
  }
  if (style === 'hair_brown') {
    return (
      <G>
        <Path
          d={`M ${CX - 20} ${FACE_TOP + 4} Q ${CX - 20} ${FACE_TOP - 4} ${CX} ${FACE_TOP - 3} Q ${CX + 20} ${FACE_TOP - 4} ${CX + 20} ${FACE_TOP + 4}`}
          fill="#6B3A2A"
        />
      </G>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Avatar Picker
// ─────────────────────────────────────────────────────────────

const STYLES: { id: AvatarStyle; label: string }[] = [
  { id: 'conductor', label: 'Conductor' },
  { id: 'baseball', label: 'Baseball Cap' },
  { id: 'turban', label: 'Turban' },
  { id: 'conical', label: 'Rice Farm Hat' },
  { id: 'hair_blonde', label: 'Blonde Hair' },
  { id: 'hair_black', label: 'Black Hair' },
  { id: 'hair_brown', label: 'Brown Hair' },
];

const SKIN_TONES = [
  { color: Colors.skinTones.white, label: 'White' },
  { color: Colors.skinTones.lightBrown, label: 'Light Brown' },
  { color: Colors.skinTones.yellow, label: 'Yellow' },
  { color: Colors.skinTones.darkBrown, label: 'Dark Brown' },
  { color: Colors.skinTones.black, label: 'Black' },
];

interface AvatarPickerProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
}

export function AvatarPicker({ config, onChange }: AvatarPickerProps) {
  return (
    <ScrollView contentContainerStyle={styles.pickerContainer}>
      {/* Large preview */}
      <View style={styles.previewContainer}>
        <Avatar config={config} size={140} />
      </View>

      {/* Style options */}
      <Text style={styles.sectionLabel}>Style</Text>
      <View style={styles.styleGrid}>
        {STYLES.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.styleOption, config.style === s.id && styles.styleOptionSelected]}
            onPress={() => onChange({ ...config, style: s.id })}
          >
            <Avatar config={{ ...config, style: s.id }} size={54} />
            <Text style={styles.styleLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Skin tone options */}
      <Text style={styles.sectionLabel}>Skin Tone</Text>
      <View style={styles.toneRow}>
        {SKIN_TONES.map((tone) => (
          <TouchableOpacity
            key={tone.color}
            style={styles.toneOption}
            onPress={() => onChange({ ...config, skinTone: tone.color })}
          >
            <View style={[
              styles.toneCircle,
              { backgroundColor: tone.color },
              config.skinTone === tone.color && styles.toneCircleSelected,
            ]} />
            <Text style={styles.toneLabel}>{tone.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  styleOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.surface,
    width: '30%',
  },
  styleOptionSelected: {
    borderColor: Colors.primary,
  },
  styleLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 5,
  },
  toneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  toneOption: {
    alignItems: 'center',
    gap: 5,
  },
  toneCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  toneCircleSelected: {
    borderColor: Colors.white,
  },
  toneLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    textAlign: 'center',
  },
});
