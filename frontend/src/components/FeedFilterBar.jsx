import { Box, Flex, Text, Tag, NativeSelect } from '@chakra-ui/react';
import {
  POST_TYPE_DISPLAY_NAMES,
  GENRE_DISPLAY_NAMES,
  INSTRUMENT_DISPLAY_NAMES,
} from '../utils/displayNameMappings';

export const DEFAULT_FILTERS = {
  postType: '',
  genres: [],
  genreMode: 'any',
  instruments: [],
  instrumentMode: 'any',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const ALL_GENRES = Object.keys(GENRE_DISPLAY_NAMES);
const ALL_INSTRUMENTS = Object.keys(INSTRUMENT_DISPLAY_NAMES);

function ModeToggle({ value, onChange }) {
  return (
    <Flex align="center" gap={1} ml={2}>
      <Text fontSize="xs" color="gray.500">Match:</Text>
      {['any', 'all'].map(mode => (
        <Tag.Root
          key={mode}
          size="sm"
          cursor="pointer"
          bg={value === mode ? 'purple.500' : 'gray.100'}
          color={value === mode ? 'white' : 'gray.600'}
          onClick={() => onChange(mode)}
        >
          {mode}
        </Tag.Root>
      ))}
    </Flex>
  );
}

function FeedFilterBar({ filters, onChange }) {
  const toggle = (field, value) => {
    const current = filters[field];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [field]: updated });
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="sm" mb={4}>

      {/* Sort + Post Type selects */}
      <Flex gap={3} mb={4} wrap="wrap">
        <NativeSelect.Root size="sm" minW="170px">
          <NativeSelect.Field
            value={filters.postType}
            onChange={e => onChange({ ...filters, postType: e.target.value })}
          >
            <option value="">All post types</option>
            {Object.entries(POST_TYPE_DISPLAY_NAMES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" minW="140px">
          <NativeSelect.Field
            value={filters.sortBy}
            onChange={e => onChange({ ...filters, sortBy: e.target.value })}
          >
            <option value="createdAt">Latest</option>
            <option value="likes">Most Liked</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" minW="130px">
          <NativeSelect.Field
            value={filters.sortOrder}
            onChange={e => onChange({ ...filters, sortOrder: e.target.value })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Flex>

      {/* Genres */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">Genres</Text>
      <Flex gap={1} flexWrap="wrap" mb={3} align="center">
        {ALL_GENRES.map(genre => {
          const active = filters.genres.includes(genre);
          return (
            <Tag.Root
              key={genre}
              size="sm"
              cursor="pointer"
              bg={active ? 'blue.500' : 'gray.100'}
              color={active ? 'white' : 'gray.700'}
              onClick={() => toggle('genres', genre)}
            >
              {GENRE_DISPLAY_NAMES[genre]}
            </Tag.Root>
          );
        })}
        {filters.genres.length > 1 && (
          <ModeToggle
            value={filters.genreMode}
            onChange={mode => onChange({ ...filters, genreMode: mode })}
          />
        )}
      </Flex>

      {/* Instruments */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">Instruments</Text>
      <Flex gap={1} flexWrap="wrap" align="center">
        {ALL_INSTRUMENTS.map(instrument => {
          const active = filters.instruments.includes(instrument);
          return (
            <Tag.Root
              key={instrument}
              size="sm"
              cursor="pointer"
              bg={active ? 'orange.500' : 'gray.100'}
              color={active ? 'white' : 'gray.700'}
              onClick={() => toggle('instruments', instrument)}
            >
              {INSTRUMENT_DISPLAY_NAMES[instrument]}
            </Tag.Root>
          );
        })}
        {filters.instruments.length > 1 && (
          <ModeToggle
            value={filters.instrumentMode}
            onChange={mode => onChange({ ...filters, instrumentMode: mode })}
          />
        )}
      </Flex>
    </Box>
  );
}

export default FeedFilterBar;
