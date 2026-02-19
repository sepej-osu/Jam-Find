import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
  Spinner,
} from '@chakra-ui/react';
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapViewController({ center, radiusMeters }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    const bounds = L.latLng(center[0], center[1]).toBounds(radiusMeters * 2);
    map.fitBounds(bounds, { padding: [30, 30], animate: true });
  }, [center, radiusMeters, map]);

  return null;
}

export default function LocationRadiusMap({
  zipCode = '',
  lat = null,
  lng = null,
  radiusMiles = 25,
  onRadiusChange,
  onLocationResolved,
  getToken,
  label = 'Distance',
  min = 1,
  max = 500,
  step = 1,
  mapHeight = '200px',
  children,
}) {
  const [center, setCenter] = useState(() => {
    if (lat && lng && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
      return [lat, lng];
    }
    return null;
  });

  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef(null);

  const radiusMeters = radiusMiles * 1609.34;

  useEffect(() => {
    if (lat && lng && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
      setCenter([lat, lng]);
    }
  }, [lat, lng]);

  const geocodeZip = useCallback(
    async (zip) => {
      setGeocoding(true);
      try {
        let data = null;

        if (getToken) {
          try {
            const token = await getToken();
            const apiBase = import.meta.env.VITE_API_URL;
            const res = await fetch(`${apiBase}/api/v1/geo/zip/${zip}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              data = await res.json();
            }
          } catch (_) {
          }
        }

        if (!data) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
            { headers: { 'User-Agent': 'JamFind/1.0' } },
          );
          if (res.ok) {
            const results = await res.json();
            if (results.length > 0) {
              data = {
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
                formattedAddress: results[0].display_name || '',
              };
            }
          }
        }

        if (data) {
          setCenter([data.lat, data.lng]);
          setAddress(data.formattedAddress || '');
          onLocationResolved?.({
            lat: data.lat,
            lng: data.lng,
            formattedAddress: data.formattedAddress || '',
          });
        }
      } catch (e) {
        console.error('Geocode failed', e);
      } finally {
        setGeocoding(false);
      }
    },
    [getToken, onLocationResolved],
  );

  useEffect(() => {
    if (lat && lng && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) return;

    const z = (zipCode || '').trim();
    if (!/^\d{5}$/.test(z)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocodeZip(z), 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [zipCode, lat, lng, geocodeZip]);

  return (
    <VStack spacing={2} align="stretch" w="100%">
      {/* Slider row */}
      <HStack justify="space-between">
        <Text fontWeight="semibold">{label}</Text>
        <Text fontSize="sm" color="gray.600">
          Within {radiusMiles} mile{radiusMiles !== 1 ? 's' : ''}
        </Text>
      </HStack>

      <Slider
        value={radiusMiles}
        min={min}
        max={max}
        step={step}
        onChange={(val) => onRadiusChange?.(val)}
      >
        <SliderTrack bg="gray.200">
          <SliderFilledTrack bg="blue.500" />
        </SliderTrack>
        <SliderThumb boxSize={5} />
      </Slider>

      <Box
        borderRadius="lg"
        overflow="hidden"
        borderWidth="1px"
        borderColor="gray.200"
        position="relative"
        height={mapHeight}
        bg="gray.100"
      >
        {geocoding && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.300"
            zIndex={999}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner color="blue.500" size="lg" />
          </Box>
        )}

        {center ? (
          <MapContainer
            center={center}
            zoom={10}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            doubleClickZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Circle
              center={center}
              radius={radiusMeters}
              pathOptions={{
                color: '#3182CE',
                fillColor: '#3182CE',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />

            <CircleMarker
              center={center}
              radius={7}
              pathOptions={{
                color: '#fff',
                fillColor: '#E53E3E',
                fillOpacity: 1,
                weight: 2,
              }}
            />

            <MapViewController center={center} radiusMeters={radiusMeters} />

            {children}
          </MapContainer>
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="gray.500"
            fontSize="sm"
          >
            Enter a valid ZIP code to see the map
          </Box>
        )}
      </Box>

      {address && (
        <Text fontSize="xs" color="gray.500" noOfLines={1}>
          📍 {address}
        </Text>
      )}
    </VStack>
  );
}