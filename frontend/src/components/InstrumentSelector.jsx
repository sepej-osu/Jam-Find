

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

// List of available instruments 

const INSTRUMENTS = [
  'Electric Guitar', 'Acoustic Guitar', 'Electric Bass', 'Drums', 'Piano',
  'Keyboard', 'Vocals', 'DJ/Production', 'Trumpet', 'Saxophone', 'Other'
];

function InstrumentSelector({ value, onChange }) {
  // value is an object like: { 'Guitar': 3, 'Drums': 5 }
  // This represents which instruments are selected and their skill levels
  
  // Handle function for checkbox toggle
  const handleCheckboxChange = (instrument) => {
    const newValue = { ...value };
    
    if (newValue[instrument]) {
      // If already selected, remove it
      delete newValue[instrument];
    } else {
      // If not selected, add it with default skill level 3
      newValue[instrument] = 3;
    }
    
    // Call the parent's onChange with the updated instruments
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
        {INSTRUMENTS.map((instrument) => {
          // Check if this instrument is currently selected
          const isSelected = value[instrument] !== undefined;
          const skillLevel = value[instrument] || 3;

          return (
            <Box key={instrument} p={3} borderWidth="1px" borderRadius="md">
              {/* Checkbox for selecting/deselecting instrument */}
              <Checkbox.Root
                checked={isSelected}
                onCheckedChange={() => handleCheckboxChange(instrument)}
                mb={isSelected ? 1 : 0} // Add margin if slider will show
              ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>
                {instrument}
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
                    value={String(skillLevel)}
                    onValueChange={(val) => handleSliderChange(instrument, val)}
                    colorPalette="blue"
                  >
                    <Slider.Track>
                      <Slider.FilledTrack />
                    </Slider.Track>
                    <Slider.Thumb boxSize={6}>
                      <Box color="blue.500" fontWeight="bold" fontSize="xs">
                        {skillLevel}
                      </Box>
                    </Slider.Thumb>
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

