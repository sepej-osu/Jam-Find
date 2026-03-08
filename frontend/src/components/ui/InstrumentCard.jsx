import { Box, Flex, Icon, Text, VStack, Progress } from '@chakra-ui/react';
import { INSTRUMENT_DISPLAY_NAMES } from '../../utils/displayNameMappings';
import { getInstrumentIcon, getSkillColor } from '../../utils/iconMappings';

function InstrumentCard({ instrument, w }) {
  return (
    <Box
      p={3}
      borderWidth="1px"
      borderRadius="md"
      bg="white"
      minW="200px"
      w={w}
      boxShadow="sm"
    >
      <Flex align="center" mb={2}>
        <Icon as={getInstrumentIcon(instrument.name)} boxSize={5} mr={2} color="black" />
        <Text fontSize="md" fontWeight="semibold">
          {INSTRUMENT_DISPLAY_NAMES[instrument.name] ?? instrument.name}
        </Text>
      </Flex>
      <VStack align="stretch" gap={1}>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">Skill Level</Text>
          <Text fontSize="sm" fontWeight="bold" color={`${getSkillColor(instrument.skillLevel)}.600`}>
            {instrument.skillLevel}/5
          </Text>
        </Flex>
        <Progress.Root
          value={parseInt(instrument.skillLevel * 20)}
          size="sm"
          colorPalette={getSkillColor(instrument.skillLevel)}
          borderRadius="full"
        >
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </VStack>
    </Box>
  );
}

export default InstrumentCard;
