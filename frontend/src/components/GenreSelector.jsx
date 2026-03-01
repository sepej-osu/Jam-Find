import { Box, Text, Checkbox, SimpleGrid, Button } from "@chakra-ui/react";
import { GENRE_DISPLAY_NAMES } from "../utils/mappings";

const GENRES = Object.entries(GENRE_DISPLAY_NAMES).map(([slug, label]) => ({ slug, label }));

function GenreSelector({ value, onChange, label }) {
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
        {GENRES.map((genre) => (
            <Checkbox.Root
              key={genre.slug}
              checked={value.includes(genre.slug)}
              onCheckedChange={() => toggle(genre.slug)}
            ><Checkbox.HiddenInput /><Checkbox.Control/><Checkbox.Label>
              {genre.label}
            </Checkbox.Label></Checkbox.Root>
          ))}
        </SimpleGrid>
    </Box>
  );
}

export default GenreSelector;