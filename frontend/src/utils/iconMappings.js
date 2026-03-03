import { IoMusicalNotes } from 'react-icons/io5';
import { FaGuitar } from 'react-icons/fa';
import {
  GiGuitarHead,
  GiGuitarBassHead,
  GiDrumKit,
  GiGrandPiano,
  GiMusicalKeyboard,
  GiMicrophone,
  GiMusicSpell,
  GiTrumpet,
  GiSaxophone,
} from 'react-icons/gi';

const INSTRUMENT_ICON_MAP = {
  electric_guitar: GiGuitarHead,
  acoustic_guitar: FaGuitar,
  electric_bass:   GiGuitarBassHead,
  drums:           GiDrumKit,
  piano:           GiGrandPiano,
  keyboard:        GiMusicalKeyboard,
  vocals:          GiMicrophone,
  dj_production:   GiMusicSpell,
  trumpet:         GiTrumpet,
  saxophone:       GiSaxophone,
  other:           IoMusicalNotes,
};

export const getInstrumentIcon = (instrumentName) =>
  INSTRUMENT_ICON_MAP[instrumentName] ?? IoMusicalNotes;

const SKILL_COLOR_MAP = {
  1: 'red',
  2: 'orange',
  3: 'yellow',
  4: 'teal',
  5: 'green',
};

export const getSkillColor = (level) => SKILL_COLOR_MAP[level] ?? 'gray';
