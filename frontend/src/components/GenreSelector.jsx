import {
  Box,
  VStack,
  Text,
  Checkbox,
  SimpleGrid
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
        <Text fontWeight="bold" mb={2}>
          {label}
        </Text>
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