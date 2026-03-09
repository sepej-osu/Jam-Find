import { Box, Flex, Text, SegmentGroup, NativeSelect, Listbox, Checkmark, createListCollection, Button, IconButton, useListboxContext, useListboxItemContext, Collapsible, Slider } from '@chakra-ui/react';
import { useState, useEffect, startTransition } from 'react';
import {
  POST_TYPE_DISPLAY_NAMES,
  GENRE_DISPLAY_NAMES,
  INSTRUMENT_DISPLAY_NAMES,
} from '../utils/displayNameMappings';
import { getInstrumentIcon, SearchIcon, MapIcon, CloseIcon } from '../utils/iconMappings';

export const DEFAULT_FILTERS = {
  postType: '',
  genres: [],
  genreMode: 'any',
  instruments: [],
  instrumentMode: 'any',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  radiusMiles: 25,
};

const ALL_GENRES = Object.keys(GENRE_DISPLAY_NAMES);
const ALL_INSTRUMENTS = Object.keys(INSTRUMENT_DISPLAY_NAMES);

const genreCollection = createListCollection({
  items: ALL_GENRES.map(k => ({ label: GENRE_DISPLAY_NAMES[k], value: k })),
});
const instrumentCollection = createListCollection({
  items: ALL_INSTRUMENTS.map(k => ({ label: INSTRUMENT_DISPLAY_NAMES[k], value: k })),
});

function ListboxSelectAll({ collection, label }) {
  const listbox = useListboxContext();
  const allValues = collection.items.map(i => i.value);
  const isAllSelected = listbox.value.length === allValues.length;
  const isSomeSelected = listbox.value.length > 0 && !isAllSelected;

  return (
    <Flex
      as="button"
      onClick={() => startTransition(() => listbox.setValue(isAllSelected ? [] : allValues))}
      px="3"
      gap="2"
      align="center"
      cursor="pointer"
      borderWidth="1px"
      minH="10"
      roundedTop="l2"
      mb="-1px"
      bg="gray.50"
      _hover={{ bg: 'gray.100' }}
    >
      <Checkmark filled size="sm" checked={isAllSelected} indeterminate={isSomeSelected} />
      <Text fontSize="sm">{label}</Text>
    </Flex>
  );
}

function ListboxItemCheckmark() {
  const item = useListboxItemContext();
  return <Checkmark filled size="sm" checked={item.selected} disabled={item.disabled} />;
}

function ListboxFilter({ label, collection, selectedValues, onValueChange, onModeChange, mode, getIcon }) {
  return (
    <Box flex="1" minW="200px" pb={1}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">{label}</Text>
      <Listbox.Root
        collection={collection}
        selectionMode="multiple"
        value={selectedValues}
        onValueChange={details => startTransition(() => onValueChange(details.value))}
        gap="0"
      >
        <ListboxSelectAll collection={collection} label={`All ${label}`} />
        <Listbox.Content maxH="200px" roundedTop="0">
          {collection.items.map(item => {
            const Icon = getIcon ? getIcon(item.value) : null;
            return (
              <Listbox.Item item={item} key={item.value}>
                <ListboxItemCheckmark />
                <Listbox.ItemText>
                  <Flex align="center" gap={2}>
                    {Icon && <Icon size={14} />}
                    {item.label}
                  </Flex>
                </Listbox.ItemText>
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Root>
      <Flex align="center" gap={2} mt={2}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">Match</Text>
        <SegmentGroup.Root
          size="sm"
          value={mode}
          onValueChange={details => onModeChange(details.value)}
          disabled={selectedValues.length <= 1}
        >
          <SegmentGroup.Indicator />
          {['any', 'all'].map(item => (
            <SegmentGroup.Item key={item} value={item}>
              <SegmentGroup.ItemText
                _checked={{ fontWeight: 'semibold' }}
              >
                {item}
              </SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Flex>
    </Box>
  );
}

function NativeFilter({ label, children }) {
  return (
    <Box minW="140px" flex="1">
      <Text fontSize="xs" fontWeight="semibold" color="jam.textMuted" mb={1} textTransform="uppercase">{label}</Text>
      {children}
    </Box>
  );
}

function FeedFilterBar({ filters, onChange, hasLocation = false }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pendingGenres, setPendingGenres] = useState(filters.genres);
  const [pendingGenreMode, setPendingGenreMode] = useState(filters.genreMode);
  const [pendingInstruments, setPendingInstruments] = useState(filters.instruments);
  const [pendingInstrumentMode, setPendingInstrumentMode] = useState(filters.instrumentMode);
  const [pendingRadius, setPendingRadius] = useState(filters.radiusMiles ?? 25);

  useEffect(() => {
    setPendingGenres(filters.genres);
    setPendingGenreMode(filters.genreMode);
    setPendingInstruments(filters.instruments);
    setPendingInstrumentMode(filters.instrumentMode);
    setPendingRadius(filters.radiusMiles ?? 25);
  }, [filters.genres, filters.genreMode, filters.instruments, filters.instrumentMode, filters.radiusMiles]);

  const handleClear = () => {
    setPendingGenres(DEFAULT_FILTERS.genres);
    setPendingGenreMode(DEFAULT_FILTERS.genreMode);
    setPendingInstruments(DEFAULT_FILTERS.instruments);
    setPendingInstrumentMode(DEFAULT_FILTERS.instrumentMode);
    setPendingRadius(DEFAULT_FILTERS.radiusMiles);
    onChange(DEFAULT_FILTERS);
  };

  const handleSearch = () => {
    onChange({
      ...filters,
      genres: pendingGenres,
      genreMode: pendingGenreMode,
      instruments: pendingInstruments,
      instrumentMode: pendingInstrumentMode,
      radiusMiles: pendingRadius,
    });
  };

  const isDirty =
    JSON.stringify(pendingGenres) !== JSON.stringify(filters.genres) ||
    pendingGenreMode !== filters.genreMode ||
    JSON.stringify(pendingInstruments) !== JSON.stringify(filters.instruments) ||
    pendingInstrumentMode !== filters.instrumentMode ||
    pendingRadius !== (filters.radiusMiles ?? 25);

  const activeAdvancedCount = filters.genres.length + filters.instruments.length + (filters.radiusMiles !== DEFAULT_FILTERS.radiusMiles ? 1 : 0);

  return (
    <Box layerStyle="card" mb={4}>

      {/* Row 1: Post Type, Sort By, Order, Advanced toggle */}
      <Flex gap={3} wrap="wrap" align="flex-end">
        <NativeFilter label="Post Type">
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={filters.postType}
              onChange={e => onChange({ ...filters, postType: e.target.value })}
            >
              <option value="">All types</option>
              {Object.entries(POST_TYPE_DISPLAY_NAMES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </NativeFilter>

        <NativeFilter label="Sort By">
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={filters.sortBy}
              onChange={e => {
                const val = e.target.value;
                const sortOrder = val === 'distance' ? 'asc' : 'desc';
                onChange({ ...filters, sortBy: val, sortOrder });
              }}
            >
              <option value="createdAt">Latest</option>
              <option value="likes">Most Liked</option>
              <option value="distance" disabled={!hasLocation}>Distance{!hasLocation ? ' (no location set)' : ''}</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </NativeFilter>

        <NativeFilter label="Order">
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={filters.sortOrder}
              onChange={e => onChange({ ...filters, sortOrder: e.target.value })}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </NativeFilter>

        <Button
          size="sm"
          variant={showAdvanced ? 'jamDark' : 'outline'}
          colorPalette={activeAdvancedCount > 0 ? 'green' : 'gray'}
          onClick={() => setShowAdvanced(v => !v)}
          alignSelf="flex-end"
        >
          Advanced{activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}
        </Button>
      </Flex>

      {/* Advanced: Genres + Instruments */}
      <Collapsible.Root open={showAdvanced}>
        <Collapsible.Content>
          <Flex gap={4} wrap="wrap" align="flex-start" mt={4}>
            <ListboxFilter
              label="Genres"
              collection={genreCollection}
              selectedValues={pendingGenres}
              onValueChange={setPendingGenres}
              onModeChange={setPendingGenreMode}
              mode={pendingGenreMode}
              colorPalette="blue"
            />
            <ListboxFilter
              label="Instruments"
              collection={instrumentCollection}
              selectedValues={pendingInstruments}
              onValueChange={setPendingInstruments}
              onModeChange={setPendingInstrumentMode}
              mode={pendingInstrumentMode}
              colorPalette="orange"
              getIcon={getInstrumentIcon}
            />
            <Box flex="1" minW="200px">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={1}>Distance</Text>
              <Slider.Root
                min={5}
                max={50}
                step={5}
                value={[pendingRadius]}
                onValueChange={details => setPendingRadius(details.value[0])}
                colorPalette="blue"
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0} boxSize={6}>
                    <Box as={MapIcon} color="red.600" />
                    <Slider.DraggingIndicator
                      layerStyle="fill.solid"
                      top="6"
                      rounded="sm"
                      px="1.5"
                    >
                      <Slider.ValueText />
                    </Slider.DraggingIndicator>
                  </Slider.Thumb>
                </Slider.Control>
              </Slider.Root>
              <Text fontSize="xs" color="gray.600" mt={1}>
                {`Within ${pendingRadius} miles`}
              </Text>
              <Button
                size="xs"
                colorPalette="red"
                variant="subtle"
                onClick={handleClear}
                mt={2}
              >
                <CloseIcon /> Clear Filters
              </Button>
            </Box>
            <IconButton
              size="sm"
              colorPalette="green"
              variant={isDirty ? 'jam' : 'outline'}
              onClick={handleSearch}
              alignSelf="flex-end"
              aria-label="Search"
              px={3}
            >
              <SearchIcon />
              Search
            </IconButton>
          </Flex>
        </Collapsible.Content>
      </Collapsible.Root>

    </Box>
  );
}

export default FeedFilterBar;
