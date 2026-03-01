

import {
  Steps,
  Box,
  Checkbox,
  Slider,
  Text,
  HStack,
  SimpleGrid,
  Button,
} from '@chakra-ui/react';
import { INSTRUMENT_DISPLAY_NAMES } from '../utils/mappings';

function InstrumentSelector({ value, onChange }) {
  // value is an object like: { 'Guitar': 3, 'Drums': 5 }
  // This represents which instruments are selected and their skill levels
  
  // Handle function for checkbox toggle
  const handleCheckboxChange = (instrument) => {
    const newValue = { ...value };
    
    if (newValue[instrument] !== undefined) {
      delete newValue[instrument];
    } else {
      newValue[instrument] = 3;
    }
    onChange(newValue);
  };

  // Handle function for skill level slider change
  const handleSliderChange = (instrument, level) => {
    const newValue = { ...value };
    newValue[instrument] = level;
    onChange(newValue);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontWeight="bold">
          Instruments & Skill Level
        </Text>
        <Button 
          size="xs"
          colorPalette="blue"
          onClick={() => onChange({})} 
          disabled={Object.keys(value).length === 0}
          variant="outline"
        >
          Clear All
        </Button>
      </Box>
      <SimpleGrid columns={2} gap={2}>
        {Object.entries(INSTRUMENT_DISPLAY_NAMES).map(([instrument, label]) => {
          const isSelected = value[instrument] !== undefined;
          const skillLevel = value[instrument] || 3;

          return (
            <Box key={instrument} p={3} borderWidth="1px" borderRadius="md">
              <Checkbox.Root
                checked={isSelected}
                onCheckedChange={() => handleCheckboxChange(instrument)}
                mb={isSelected ? 1 : 0}
              ><Checkbox.HiddenInput /><Checkbox.Control/><Checkbox.Label>
                {label}
              </Checkbox.Label></Checkbox.Root>
              {/* Slider only shows when instrument is checked */}
              {isSelected && (
                <Box pl={6}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.600">
                      Skill Level:
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {skillLevel}
                    </Text>
                  </HStack>
                  
                  <Slider.Root
                    min={1}
                    max={5}
                    step={1}
                    value={[skillLevel]}
                    onValueChange={({ value }) =>
                      handleSliderChange(instrument, value[0])
                    }
                    colorPalette="blue"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0} boxSize={6}>
                        <Slider.HiddenInput />
                        <Box color="blue.500" fontWeight="bold" fontSize="xs">
                          {skillLevel}
                        </Box>
                      </Slider.Thumb>
                    </Slider.Control>
                  </Slider.Root>
                  
                  {/* Labels under the slider */}
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.500">Beginner</Text>
                    <Text fontSize="xs" color="gray.500">Expert</Text>
                  </HStack>
                </Box>
              )}
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

export default InstrumentSelector;

