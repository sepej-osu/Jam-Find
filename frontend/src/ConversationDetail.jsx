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
    // we define this function will handle the loading of conversation details and messages. 
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
      // Fetch the conversation details and the first page of messages in parallel
      // so the screen loads faster than awaiting them one after the other.
      // Promise.all runs the two requests in parallel and waits for both to finish before proceeding.
        const [conversation, messagesData] = await Promise.all([
          conversationService.getConversation(conversationId),
          conversationService.getConversationMessages(conversationId, { limit: 20 }),
        ]);

        setConversation(conversation);
        // Here we create a shallow copy of the messages array and reverse it so the
        // most recent messages are at the bottom of the screen.
        setMessages(Array.from(messagesData.messages).reverse());
      } catch (err) {
        setError(err.message || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };
    // reload the conversation details when the component mounts and whenever
    // the conversationId changes (e.g. when navigating to a different conversation)
    load();
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
      const newMessage = await conversationService.sendMessage(conversationId, draft);
      setMessages((prev) => [...prev, newMessage]);
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

      <Box layerStyle="card">
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500" mb={3}>{error}</Text>}
        
        {!loading && (
          <VStack align="stretch" gap={3} mb={4}>
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
