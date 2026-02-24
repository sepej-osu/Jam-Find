import { Box, Text, Checkbox, SimpleGrid, Button } from "@chakra-ui/react";

function GenreSelector({ value, onChange, options, label }) {
  const toggle = (genre) => {
    if (value.includes(genre)) {
      onChange(value.filter(g => g !== genre))
    } else {
      onChange([...value, genre])
    }
  }

  return (
    <Box>
      {label && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontWeight="bold">
            {label}
          </Text>
          <Button 
            size="xs"
            colorPalette="blue"
            onClick={() => onChange([])} 
            //visibility={value.length > 0 ? 'visible' : 'hidden'}
            disabled={value.length === 0}
            variant="outline"
          >
            Clear All
          </Button>
        </Box>
      )}
      <SimpleGrid columns={3} gap={2}>
        {options.map((genre) => (
            <Checkbox.Root
              key={genre}
              checked={value.includes(genre)}
              onCheckedChange={() => toggle(genre)}
            ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>
              {genre}
            </Checkbox.Label></Checkbox.Root>
          ))}
        </SimpleGrid>
    </Box>
  );
}

export default GenreSelector;