import { useEffect, useState, useRef } from 'react';
import { Box, Button, Center, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import conversationService from './services/conversationService';
import profileService from './services/profileService';
import InputField from './components/InputField';

function ConversationDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherParticipantProfile, setOtherParticipantProfile] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // ref for the last message element
  const lastMessageRef = useRef(null);

  const chatHeight = '75vh';

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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current && messages.length > 0) {
      try {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch (e) {
        /* ignore */
      }
    }
  }, [messages]);

  // we find the ID of the other participant in the conversation by looking at the participantIds array
  const otherParticipantId = conversation?.participantIds?.find(
    (id) => id !== currentUser?.uid
  );
 // use the ID to get their snapshot object which has their denormalized name.
  const snapshot = otherParticipantId
    ? conversation?.participantSnapshots?.[otherParticipantId]
    : null;
    

  useEffect(() => {
    // cancelled flag to prevent state updates on unmounted component if user
    // navigates away before the profile fetch completes
    let cancelled = false;

    // this function gets the other users profile to verify the participant
    // snapshot data is up to date
    const fetchOtherParticipantProfile = async () => {
      if (!otherParticipantId) {
        setOtherParticipantProfile(null);
        return;
      }

      try {
        // we get the other users profile to check their name and profile picture.
        const p = await profileService.getProfile(otherParticipantId);
        if (!cancelled) {
          setOtherParticipantProfile(p);
          // Compare actual snapshot-relevant fields. Sync only if they've changed.
          const stored = conversation?.participantSnapshots?.[otherParticipantId];
          const storedFirst = stored?.firstName || '';
          const storedLast = stored?.lastName || '';
          const storedPic = stored?.profilePicUrl || '';

          const liveFirst = p?.firstName || '';
          const liveLast = p?.lastName || '';
          const livePic = p?.profilePicUrl || '';

          if (
            storedFirst !== liveFirst ||
            storedLast !== liveLast ||
            storedPic !== livePic
          ) {
            // call the syncing endpoint but don't wait for it to complete so that it can
            // do its work in the background
            void conversationService.syncSnapshots(conversationId).catch((error) => {
              console.error('Failed to sync conversation snapshots', error);
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          // if the fetch fails, we can still just show the stale snapshot data
          setOtherParticipantProfile(null);
        }
      }
    };
    fetchOtherParticipantProfile();

    return () => {
      cancelled = true; // set to true to prevent state updates after unmounting
    };
  }, [otherParticipantId]); // we only re-fetch the other participant's profile if their ID changes, which should be rare since most conversations will be with the same person

  // Prefer freshly-fetched profile for the detail view; fall back to denormalized snapshot.
  const otherParticipantName = (() => {
    if (otherParticipantProfile) {
      return `${otherParticipantProfile.firstName || ''} ${otherParticipantProfile.lastName || ''}`.trim() || 'Conversation';
    }
    return `${snapshot?.firstName || ''} ${snapshot?.lastName || ''}`.trim() || 'Conversation';
  })();

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

      <Box layerStyle="card" height={chatHeight} display="flex" flexDirection="column">
        {loading && (
          <Center py={8}>
            <Spinner />
          </Center>
        )}

        {error && <Text color="red.500" mb={3}>{error}</Text>}
        
        {!loading && (
          <Box flex="1" mb={4} overflowY="auto">
            <VStack align="stretch" gap={3} px={3} py={3}>
              {messages.length === 0 && <Text color="jam.textMuted">No messages yet.</Text>}
              {/* Here we map through the messages array to display each conversation message.
              We change the alignment and color based on whether the message is sent by the current user. */}
              {messages.map((message, idx) => {
                const mine = message.senderId === currentUser?.uid;
                const isLast = idx === messages.length - 1;
                return (
                  <Box
                    key={message.messageId}
                    ref={isLast ? lastMessageRef : undefined}
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
          </Box>
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
