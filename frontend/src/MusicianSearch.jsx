import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
  Avatar,
  Tag,
  TagLabel,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from './contexts/AuthContext';
import { searchMusicians } from './services/searchService';
import LocationRadiusMap from './components/LocationRadiusMap';

function MusicianSearch() {
  const toast = useToast();
  const { currentUser, profile } = useAuth();

  const [zip, setZip] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [instrument, setInstrument] = useState('');
  const [genre, setGenre] = useState('');
  const [mapLat, setMapLat] = useState(null);
  const [mapLng, setMapLng] = useState(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (profile) {
      if (profile.zipCode) setZip(profile.zipCode);
      if (profile.searchRadiusMiles) setRadiusMiles(profile.searchRadiusMiles);
      if (profile.location?.lat && profile.location?.lng) {
        setMapLat(profile.location.lat);
        setMapLng(profile.location.lng);
      }
    }
  }, [profile]);

  const getToken = useCallback(async () => {
    if (!currentUser) throw new Error('No user logged in');
    return currentUser.getIdToken();
  }, [currentUser]);

  const handleLocationResolved = useCallback(({ lat, lng }) => {
    setMapLat(lat);
    setMapLng(lng);
  }, []);

  const runSearch = async () => {
    if (!currentUser) return;

    const z = (zip || '').trim();
    if (!/^\d{5}$/.test(z)) {
      toast({
        title: 'Invalid ZIP Code',
        description: 'Enter a 5-digit ZIP code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const data = await searchMusicians(token, {
        radiusMiles,
        instrument: instrument || undefined,
        genre: genre || undefined,
        limit: 50,
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({
        title: 'Search failed',
        description: err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="900px" mx="auto" px={4} py={6}>
      <Heading size="lg" mb={4}>Find Musicians Near You</Heading>

      <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
        <VStack align="stretch" spacing={3}>
          <HStack spacing={3} wrap="wrap">
            <Box flex="1">
              <Text fontSize="sm" mb={1} color="gray.600">ZIP Code</Text>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="e.g., 34119"
                maxW="220px"
              />
            </Box>

            <Box flex="1">
              <Text fontSize="sm" mb={1} color="gray.600">Instrument (optional)</Text>
              <Input
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="e.g., Electric Guitar"
              />
            </Box>

            <Box flex="1">
              <Text fontSize="sm" mb={1} color="gray.600">Genre (optional)</Text>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., Metal"
              />
            </Box>
          </HStack>

          <LocationRadiusMap
            zipCode={zip}
            lat={mapLat}
            lng={mapLng}
            radiusMiles={radiusMiles}
            onRadiusChange={setRadiusMiles}
            onLocationResolved={handleLocationResolved}
            getToken={getToken}
            max={100}
            mapHeight="180px"
          />

          <Button colorScheme="blue" onClick={runSearch} isDisabled={loading} size="md">
            Search
          </Button>

          <Text fontSize="sm" color="gray.600">
            Privacy note: we only use ZIP codes (no full addresses).
          </Text>
        </VStack>
      </Box>

      <Divider my={5} />

      {/* Results */}
      {loading ? (
        <Flex align="center" justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <VStack align="stretch" spacing={3}>
          {results.length === 0 ? (
            <Text color="gray.600">No results yet. Try searching.</Text>
          ) : (
            results.map((p) => (
              <Box key={p.userId} borderWidth="1px" borderRadius="lg" p={4} bg="white">
                <Flex justify="space-between" align="flex-start" gap={4}>
                  <HStack spacing={3} align="flex-start">
                    <Avatar size="md" src={p.profilePicUrl || ''} />
                    <Box>
                      <Text fontWeight="bold">
                        {(p.firstName || '')} {(p.lastName || '')}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {p.distanceMiles} miles away • ZIP {p.zipCode}
                      </Text>

                      <HStack spacing={2} mt={2} wrap="wrap">
                        {(p.instruments || []).slice(0, 5).map((i, idx) => (
                          <Tag key={idx} size="sm">
                            <TagLabel>{i.name}</TagLabel>
                          </Tag>
                        ))}
                        {(p.genres || []).slice(0, 5).map((g, idx) => (
                          <Tag key={idx} size="sm" variant="subtle">
                            <TagLabel>{g}</TagLabel>
                          </Tag>
                        ))}
                      </HStack>
                    </Box>
                  </HStack>
                </Flex>
              </Box>
            ))
          )}
        </VStack>
      )}
    </Box>
  );
}

export default MusicianSearch;
