import { useEffect, useState } from 'react';
import { Box, Center, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import conversationService from './services/conversationService';

function Messages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // we use useEffect to set up a real-time listener for the user's conversations when the component mounts
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);

    // callback functions for the conversations listener
    const handleConversationSnapshot = (conversations) => {
      setConversations(conversations);
      setError(null);
      setLoading(false);
    };

    const handleConversationError = (listenerError) => {
      setError(listenerError.message || 'Failed to load conversations');
      setLoading(false);
    };

// we make the call to subscribeConversations, passing in the current user's ID and the two callback functions we just defined.
    const unsubscribe = conversationService.subscribeConversations({
      currentUserId: currentUser.uid,
      onData: handleConversationSnapshot,
      onError: handleConversationError,
    });

    // returns function that unsubscribes from the listener when the component 
    // unmounts or the user ID changes
    return unsubscribe;
  }, [currentUser?.uid]);

  const getConversationDisplayName = (conversation) => {
    // we find the ID of the other participant in the conversation by looking at the participantIds array
    const otherParticipantId = conversation.participantIds.find((id) => id !== currentUser?.uid);
    if (!otherParticipantId) return 'Unknown user'; // this should not happen
    // we use the ID to get their snapshot object which has their denormalized name.
    const snapshot = conversation.participantSnapshots?.[otherParticipantId];
    if (!snapshot) return 'Unknown user';

    const firstName = snapshot.firstName || '';
    const lastName = snapshot.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName;
  };

  return (
    <Box mx="auto" layerStyle="card">
      <Heading size="lg" mb={4}>Messages</Heading>

      <Box>
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500">{error}</Text>}

        {!loading && !error && conversations.length === 0 && (
          <Text color="jam.textMuted">No conversations yet.</Text>
        )}

        {!loading && !error && conversations.length > 0 && ( 
          <VStack align="stretch" gap={3}>
            {conversations.map((conversation) => (
              <Box
                key={conversation.conversationId}
                name="conversation-card"
                layerStyle="card"
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                data-testid="conversation-card"
                data-conversation-id={conversation.conversationId}
                onClick={() => navigate(`/messages/${conversation.conversationId}`)}
              >
                
                <Text fontWeight="semibold" color="jam.text" data-testid="conversation-name">
                  {getConversationDisplayName(conversation)}
                </Text>
                {/* we show a preview of the last message in the conversation. 
                If there are no messages yet, we show a placeholder text. */}
                <Text color="jam.textMuted" noOfLines={1}>
                  {conversation.lastMessagePreview || 'No messages yet'}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export default Messages;
