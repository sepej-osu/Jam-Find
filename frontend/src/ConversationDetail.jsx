import { useEffect, useState } from 'react';
import { Box, Button, Center, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import conversationService from './services/conversationService';
import InputField from './components/InputField';

function ConversationDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    // reset loading and error state every time we enter a new conversation thread
    setLoading(true);
    setError(null);

    // we wait for both listeners (conversation metadata + messages) before hiding the spinner
    let conversationLoaded = false;
    let messagesLoaded = false;

    const markLoaded = () => {
      if (conversationLoaded && messagesLoaded) {
        setLoading(false);
      }
    };

    // callback functions for the conversation listener
    const handleConversationSnapshot = (conversationData) => {
      setConversation(conversationData);
      conversationLoaded = true;
      markLoaded();
    };

    const handleConversationError = (listenerError) => {
      setError(listenerError.message || 'Failed to load conversation');
      setLoading(false);
    };

    // callback functions for the messages listener
    const handleMessagesSnapshot = (messageItems) => {
      setMessages(messageItems);
      messagesLoaded = true;
      markLoaded();
    };

    const handleMessagesError = (listenerError) => {
      setError(listenerError.message || 'Failed to load messages');
      setLoading(false);
    };

    // start both realtime listeners in parallel so the page can update the header and chat together
    const unsubscribeConversation = conversationService.subscribeConversation({
      conversationId,
      onData: handleConversationSnapshot,
      onError: handleConversationError,
    });

    const unsubscribeMessages = conversationService.subscribeConversationMessages({
      conversationId,
      onData: handleMessagesSnapshot,
      onError: handleMessagesError,
      limit: 300,
    });

    // cleanup both listeners when leaving the page or switching to a different conversation
    // each returns an unsubscribe function that we call here to stop listening for updates
    // from Firestore when the component unmounts or the conversation ID changes
    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId]);

  // we find the ID of the other participant in the conversation by looking at the participantIds array
  const otherParticipantId = conversation?.participantIds.find(
    (id) => id !== currentUser?.uid
  );
 // use the ID to get their snapshot object which has their denormalized name.
  const snapshot = otherParticipantId
    ? conversation?.participantSnapshots?.[otherParticipantId]
    : null;
  // we construct the other participant's name by combining their first and last name from the snapshot.
  const otherParticipantName =
    `${snapshot?.firstName || ''} ${snapshot?.lastName || ''}`.trim() || 'Conversation';

  const handleSend = async () => {
    // prevent sending empty or multiple messages at the same time
    if (!draft.trim() || sending) return; 

    setSending(true);
    try {
      //we call the sendMessage method from the conversationService to send the message to the backend.
      await conversationService.sendMessage(conversationId, draft);
      setDraft(''); // clear the input field after sending the message

    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box layerStyle="card" mx="auto" color="jam.text">
      <HStack mb={4} justify="space-between">
        <Button variant="jam" onClick={() => navigate('/messages')}>
          Back
        </Button>
        <Heading size="md" cursor="pointer" onClick={() => navigate(`/profile/${otherParticipantId}`)}>{otherParticipantName}</Heading>
      </HStack>

      <Box layerStyle="card" height="800px" display="flex" flexDirection="column">
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500" mb={3}>{error}</Text>}
        
        {!loading && (
          <VStack align="stretch" gap={3} mb={4} flex="1" overflowY="auto">
            {messages.length === 0 && <Text color="jam.textMuted">No messages yet.</Text>}
            {/* Here we map through the messages array to display each conversation message.
            We change the alignment and color based on whether the message is sent by the current user. */}
            {messages.map((message) => {
              const mine = message.senderId === currentUser?.uid;
              return (
                <Box
                  key={message.messageId}
                  alignSelf={mine ? 'flex-end' : 'flex-start'}
                  bg={mine ? 'jam.50' : 'jam.400'}
                  borderRadius="md"
                  px={3}
                  py={2}
                  maxW="80%"
                >
                  <Text whiteSpace="break-spaces">{message.content}</Text>
                </Box>
              );
            })}
          </VStack>
        )}

        <HStack>
          <Box flex="1" onKeyDown={(event) => {
            // we listen for the Enter key press in the input field to allow sending messages by pressing Enter.
            // We also allow users to create new lines by pressing Shift + Enter.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}>
            <InputField
              label="Message"
              maxLength={500}
              name="messageDraft"
              type="textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
            />
          </Box>
          <Button onClick={handleSend} loading={sending} variant="jam">
            Send
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default ConversationDetail;
