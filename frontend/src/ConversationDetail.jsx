import { useEffect, useMemo, useState } from 'react';
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
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [conversationData, messagesData] = await Promise.all([
          conversationService.getConversation(conversationId),
          conversationService.getConversationMessages(conversationId, { limit: 20 }),
        ]);

        setConversation(conversationData);
        setMessages((messagesData.messages || []).slice().reverse());
      } catch (err) {
        setError(err.message || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [conversationId, currentUser?.uid]);

  const otherParticipantName = useMemo(() => {
    if (!conversation) return 'Conversation';
    const otherParticipantId = (conversation.participantIds || []).find((id) => id !== currentUser?.uid);
    if (!otherParticipantId) return 'Conversation';

    const snapshot = conversation.participantSnapshots?.[otherParticipantId];
    const firstName = snapshot?.firstName || '';
    const lastName = snapshot?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || 'Conversation';
  }, [conversation, currentUser?.uid]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const newMessage = await conversationService.sendMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, newMessage]);
      setDraft('');
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastMessagePreview: newMessage.content,
          lastMessageSenderId: newMessage.senderId,
          lastMessageSentAt: newMessage.createdAt,
          updatedAt: newMessage.createdAt,
        };
      });
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box maxW="900px" mx="auto" mt="80px" px={4} pb={8}>
      <HStack mb={4} justify="space-between">
        <Button variant="outline" onClick={() => navigate('/messages')}>
          Back
        </Button>
        <Heading size="md">{otherParticipantName}</Heading>
      </HStack>

      <Box borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md" p={4}>
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500" mb={3}>{error}</Text>}

        {!loading && (
          <VStack align="stretch" gap={3} mb={4}>
            {messages.length === 0 && <Text color="gray.600">No messages yet.</Text>}

            {messages.map((message) => {
              const mine = message.senderId === currentUser?.uid;
              return (
                <Box
                  key={message.messageId}
                  alignSelf={mine ? 'flex-end' : 'flex-start'}
                  bg={mine ? 'cyan.100' : 'gray.100'}
                  borderRadius="md"
                  px={3}
                  py={2}
                  maxW="80%"
                >
                  <Text>{message.content}</Text>
                </Box>
              );
            })}
          </VStack>
        )}

        <HStack>
          <Box flex="1" onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}>
            <InputField
              label="Message"
              name="messageDraft"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
            />
          </Box>
          <Button onClick={handleSend} loading={sending} colorPalette="cyan">
            Send
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default ConversationDetail;
