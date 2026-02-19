import {
  Box,
  Heading,
  Text,
  Flex,
  Tag,
  Icon,
  Badge,
  Divider,
  Avatar,
  IconButton,
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaGuitar } from 'react-icons/fa';
import { IoMusicalNotes, IoHeart, IoHeartOutline } from 'react-icons/io5';
import {
  GiGuitarHead,
  GiGuitarBassHead,
  GiDrumKit,
  GiGrandPiano,
  GiMusicalKeyboard,
  GiMicrophone,
  GiMusicSpell,
  GiTrumpet,
  GiSaxophone
} from 'react-icons/gi';

const INSTRUMENT_ICONS = {
  'Electric Guitar': GiGuitarHead,
  'Acoustic Guitar': FaGuitar,
  'Electric Bass': GiGuitarBassHead,
  'Drums': GiDrumKit,
  'Piano': GiGrandPiano,
  'Keyboard': GiMusicalKeyboard,
  'Vocals': GiMicrophone,
  'DJ/Production': GiMusicSpell,
  'Trumpet': GiTrumpet,
  'Saxophone': GiSaxophone,
  'Other': IoMusicalNotes
};

const POST_TYPE_LABELS = {
  'looking_to_jam': 'Looking to Jam 🎶',
  'looking_for_band': 'Looking for a Band 🎤',
  'looking_for_musicians': 'Looking for Musicians 🎸',
  'sharing_music': 'Sharing Music 🎵'
};

export function getPostTypeLabel(type) {
  return POST_TYPE_LABELS[type] || type;
}

export function getInstrumentIcon(name) {
  return INSTRUMENT_ICONS[name] || IoMusicalNotes;
}

export default function PostCard({
  post,
  author = null,
  onLikeToggle,
  onClick,
}) {
  const postType = post.postType || post.post_type;
  const createdAt = post.created_at || post.createdAt;
  const likesCount = post.likes || 0;
  const isLiked = post.likedByCurrentUser || false;

  return (
    <Box
      p={6}
      borderWidth="1px"
      borderRadius="lg"
      bg="white"
      boxShadow="md"
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Badge colorScheme="blue" fontSize="md">
          {getPostTypeLabel(postType)}
        </Badge>

        {typeof post.distanceMiles === 'number' && (
          <Text fontSize="sm" color="gray.600">
            {post.distanceMiles} miles away
          </Text>
        )}
      </Flex>

      {author && (
        <Flex align="center" mb={4}>
          <Avatar
            size="sm"
            src={author.profilePicUrl}
            name={`${author.firstName} ${author.lastName}`}
            mr={3}
          />
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              {author.firstName} {author.lastName}
            </Text>
            {author.gender && (
              <Text fontSize="xs" color="gray.500">{author.gender}</Text>
            )}
            {author.location?.formattedAddress && (
              <Text fontSize="sm" color="gray.600">
                <Icon as={FaMapMarkerAlt} color="red.600" display="inline" mb="-1px" mr="1" />
                {author.location.formattedAddress}
              </Text>
            )}
          </Box>
        </Flex>
      )}

      <Heading size="md" mb={3}>
        {post.title}
      </Heading>

      {post.location?.formattedAddress && (
        <Flex align="center" mb={3} color="gray.600">
          <Icon as={FaMapMarkerAlt} color="red.600" mr={2} />
          <Text fontSize="md">{post.location.formattedAddress}</Text>
        </Flex>
      )}

      <Divider mb={4} />

      <Text fontSize="md" color="gray.800" noOfLines={4} whiteSpace="pre-wrap">
        {post.body}
      </Text>

      {post.instruments?.length > 0 && (
        <Box mt={4}>
          <Flex gap={2} flexWrap="wrap">
            {post.instruments.slice(0, 6).map((instrument, idx) => (
              <Tag key={idx} size="md" color="white" fontWeight="semibold" bg="gray.700">
                <Icon as={getInstrumentIcon(instrument.name)} boxSize={4} mr={2} />
                {instrument.name}
              </Tag>
            ))}
          </Flex>
        </Box>
      )}

      {post.genres?.length > 0 && (
        <Box mt={4}>
          <Flex gap={2} flexWrap="wrap">
            {post.genres.slice(0, 8).map((genre, idx) => (
              <Tag key={idx} size="md" color="white" fontWeight="semibold" bg="blue.500">
                {genre}
              </Tag>
            ))}
          </Flex>
        </Box>
      )}

      <Divider my={4} />

      <Flex justify="space-between" align="center">
        <Flex align="center" gap={2}>
          <IconButton
            aria-label={isLiked ? "Unlike post" : "Like post"}
            icon={<Icon as={isLiked ? IoHeart : IoHeartOutline} boxSize={6} />}
            colorScheme={isLiked ? "red" : "gray"}
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLikeToggle?.(post.postId);
            }}
            size="lg"
          />
          <Text fontWeight="semibold" fontSize="md">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </Flex>

        <Text fontSize="sm" color="gray.500">
          {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
        </Text>
      </Flex>
    </Box>
  );
}