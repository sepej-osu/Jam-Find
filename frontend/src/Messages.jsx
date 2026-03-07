import { useEffect, useState } from 'react';
import { Box, Button, Center, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import conversationService from './services/conversationService';
import profileService from './services/profileService';

function Messages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [fallbackNames, setFallbackNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await conversationService.getConversations({ limit: 10 });
      setConversations(data.conversations || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await conversationService.getConversations({
        limit: 10,
        lastDocId: nextPageToken,
      });
      setConversations((prev) => [...prev, ...(data.conversations || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err.message || 'Failed to load more conversations');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const resolveMissingNames = async () => {
      const missingParticipantIds = conversations
        .map((conversation) => (conversation.participantIds || []).find((id) => id !== currentUser?.uid))
        .filter((id) => {
          if (!id) return false;
          if (fallbackNames[id]) return false;

          const conversation = conversations.find((item) => (item.participantIds || []).includes(id));
          const snapshot = conversation?.participantSnapshots?.[id];
          return !(snapshot?.firstName || snapshot?.lastName);
        });

      if (missingParticipantIds.length === 0) return;

      const uniqueIds = Array.from(new Set(missingParticipantIds));
      const profileResults = await Promise.all(uniqueIds.map((id) => profileService.getProfile(id).catch(() => null)));

      const updates = {};
      uniqueIds.forEach((id, index) => {
        const profile = profileResults[index];
        if (!profile) return;
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        if (fullName) {
          updates[id] = fullName;
        }
      });

      if (Object.keys(updates).length > 0) {
        setFallbackNames((prev) => ({ ...prev, ...updates }));
      }
    };

    resolveMissingNames();
  }, [conversations, currentUser?.uid, fallbackNames]);

  const getOtherParticipantName = (conversation) => {
    const otherParticipantId = (conversation.participantIds || []).find((id) => id !== currentUser?.uid);
    if (!otherParticipantId) return 'Unknown user';

    const snapshot = conversation.participantSnapshots?.[otherParticipantId];
    if (!snapshot) return fallbackNames[otherParticipantId] || 'Unknown user';

    const firstName = snapshot.firstName || '';
    const lastName = snapshot.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || fallbackNames[otherParticipantId] || 'Unknown user';
  };

  return (
    <Box maxW="900px" mx="auto" mt="80px" px={4} pb={8}>
      <Heading size="lg" mb={4}>Messages</Heading>

      <Box borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md" p={4}>
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500">{error}</Text>}

        {!loading && !error && conversations.length === 0 && (
          <Text color="gray.600">No conversations yet.</Text>
        )}

        {!loading && !error && conversations.length > 0 && (
          <VStack align="stretch" gap={3}>
            {conversations.map((conversation) => (
              <Box
                key={conversation.conversationId}
                borderWidth="1px"
                borderRadius="md"
                p={3}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                onClick={() => navigate(`/messages/${conversation.conversationId}`)}
              >
                <Text fontWeight="bold">{getOtherParticipantName(conversation)}</Text>
                <Text color="gray.600" noOfLines={1}>
                  {conversation.lastMessagePreview || 'No messages yet'}
                </Text>
              </Box>
            ))}

            {nextPageToken && (
              <Button onClick={loadMore} loading={loadingMore} alignSelf="center" variant="outline">
                Load more
              </Button>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export default Messages;
