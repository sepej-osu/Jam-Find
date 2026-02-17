import {
  Box,
  Text,
  Checkbox,
  SimpleGrid,
  Button
} from "@chakra-ui/react"

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
            colorScheme="blue"
            onClick={() => onChange([])} 
            //visibility={value.length > 0 ? 'visible' : 'hidden'}
            isDisabled={value.length === 0}
            variant="outline"
          >
            Clear All
          </Button>
        </Box>
      )}

    <SimpleGrid columns={3} spacing={2}>
      {options.map((genre) => (
          <Checkbox
            key={genre}
            isChecked={value.includes(genre)}
            onChange={() => toggle(genre)}
          >
            {genre}
          </Checkbox>
        ))}
      </SimpleGrid>    
    </Box>
  )
}

export default GenreSelector;