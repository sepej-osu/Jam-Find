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

export const POST_TYPE_DISPLAY_NAMES = {
  looking_to_jam:          'Looking to Jam 🎶',
  looking_for_band:        'Looking for a Band 🎤',
  looking_for_musicians:   'Looking for Musicians 🎸',
  sharing_music:           'Sharing Music 🎵',
};

export const GENDER_DISPLAY_NAMES = {
  male:              'Male',
  female:            'Female',
  non_binary:         'Non-Binary',
  not_listed:        'Not Listed',
  prefer_not_to_say: 'Prefer Not to Say',
};

export const INSTRUMENT_DISPLAY_NAMES = {
  electric_guitar: 'Electric Guitar',
  acoustic_guitar: 'Acoustic Guitar',
  electric_bass:   'Electric Bass',
  drums:           'Drums',
  piano:           'Piano',
  keyboard:        'Keyboard',
  vocals:          'Vocals',
  dj_production:   'DJ/Production',
  trumpet:         'Trumpet',
  saxophone:       'Saxophone',
  other:           'Other',
};

export const GENRE_DISPLAY_NAMES = {
  rock:         'Rock',
  pop:          'Pop',
  jazz:         'Jazz',
  blues:        'Blues',
  country:      'Country',
  r_n_b:        'R&B',
  hip_hop:      'Hip Hop',
  hardcore:     'Hardcore',
  electronic:   'Electronic',
  classical:    'Classical',
  metal:        'Metal',
  death_metal:  'Death Metal',
  folk:         'Folk',
  reggae:       'Reggae',
  punk:         'Punk',
  indie:        'Indie',
  soul:         'Soul',
  funk:         'Funk',
  latin:        'Latin',
  alternative:  'Alternative',
  gospel:       'Gospel',
  experimental: 'Experimental',
  other:        'Other',
};

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
