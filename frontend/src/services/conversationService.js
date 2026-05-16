import { auth } from '../firebase';
import { db } from '../firebase';
import {
  collection,
  doc,
  limit as limitQuery,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

/**
 *
 * A service module that handles all conversation and messaging data operations.
 * It connects to Firebase Firestore for real-time data and a REST API for
 * write operations (creating conversations and sending messages).
 *
 * -----------------------------------------------------------------------------
 * REAL-TIME LISTENERS (Firestore onSnapshot)
 * -----------------------------------------------------------------------------
 * Three subscribe methods set up live Firestore listeners. Each one:
 *   - Takes an object with callback functions (onData, onError)
 *   - Calls onData whenever Firestore pushes new data
 *   - Calls onError if the listener fails
 *   - Returns an unsubscribe function — call it to stop listening (used in
 *     React useEffect cleanup)
 *
 *   subscribeConversations       — all conversations for the current user
 *   subscribeConversation        — a single conversation by ID
 *   subscribeConversationMessages — all messages within a conversation
 *
 * -----------------------------------------------------------------------------
 * REST API CALLS
 * -----------------------------------------------------------------------------
 * Two async methods POST to the backend API. Each one fetches a Firebase auth
 * token and includes it as a Bearer token in the Authorization header.
 *
 *   createConversation(recipientId)          — starts a new conversation
 *   sendMessage(conversationId, content)     — sends a message
 *
 * -----------------------------------------------------------------------------
 * DATA NORMALIZATION
 * -----------------------------------------------------------------------------
 * Raw Firestore documents are normalized before being passed to the UI:
 *   - Firestore Timestamps are converted to ISO strings (toIsoString)
 *   - Participant snapshot fields are standardized to camelCase
 *     (normalizeParticipantSnapshot)
 *   - Conversation and message documents are reshaped into consistent
 *     objects (normalizeConversationDocument, normalizeMessageDocument)
 */



async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  return user.getIdToken();
}

// This helper function converts a Firestore timestamp or JavaScript
// Date object to an ISO string format for consistency
function toIsoString(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

// normalizes the participant snapshot data from Firestore
// it takes a snapshot object and returns a normalized participant object
// with consistent field names and default values.
function normalizeParticipantSnapshot(snapshot = {}) {

  // TODO: we can remove the snake_case support later, once we are ready to
  // nuke the DB again before deployment
  const participants = {
    firstName: snapshot.firstName ?? snapshot.first_name ?? '',
    lastName: snapshot.lastName ?? snapshot.last_name ?? '',
    profilePicUrl: snapshot.profilePicUrl ?? snapshot.profile_pic_url ?? null,
  };
  return participants;
}

// this function takes a firestore document snapshot for a conversation and
// normalizes its data into a consistent format. Its called by the realtime
// listeners to convert the raw Firestore data
function normalizeConversationDocument(docSnapshot) {
  const data = docSnapshot.data();
  const rawSnapshots = data?.participant_snapshots ?? {};
  const normalizedSnapshots = {};
  for (const entry of Object.entries(rawSnapshots)) {
    const uid = entry[0];
    const snapshot = entry[1];
    normalizedSnapshots[uid] = normalizeParticipantSnapshot(snapshot);
  }

  return {
    conversationId: docSnapshot.id,
    participantIds: data?.participant_ids,
    createdAt: toIsoString(data?.createdAt),
    updatedAt: toIsoString(data?.updatedAt),
    lastMessagePreview: data?.last_message_preview,
    lastMessageSentAt: toIsoString(data?.last_message_sent_at),
    lastMessageSenderId: data?.last_message_sender_id,
    participantSnapshots: normalizedSnapshots,
  };
}

// normalizes a Firestore document snapshot for a message
function normalizeMessageDocument(docSnapshot, conversationId) {
  const data = docSnapshot.data();
  return {
    messageId: docSnapshot.id,
    conversationId,
    senderId: data?.senderId ?? data?.sender_id ?? null,
    content: data?.content ?? '',
    createdAt: toIsoString(data?.createdAt),
  };
}

const conversationService = {

// This function sets up a real-time listener (via Firestore's onSnapshot) for the current user's conversations.
// It listens for changes to the conversations collection where the user is a participant.
  subscribeConversations: ({
    currentUserId, // string
    onData,  // callback function
    onError, // callback function
    limit = 50
  }) => {
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    // create the query where the user is a participant
    const conversationsRef = collection(db, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('participant_ids', 'array-contains', currentUserId),
      orderBy('updatedAt', 'desc'),
      limitQuery(limit)
    );
    // callback function to handle incoming snapshot data.
    const handleSnapshot = (snapshot) => {
      const conversations = snapshot.docs.map(
        normalizeConversationDocument
      );
      // then we pass that normalized conversation data to the onData callback 
      // provided by the component that called subscribeConversations.
      onData?.(conversations);
    };
    // callback function to handle errors that occur while listening for real-time updates.
    const handleError = (error) => {
      console.error('Realtime conversation listener failed:', error);
      onError?.(error);
    };

    return onSnapshot(
      conversationsQuery, 
      handleSnapshot,
      handleError 
    );
  },

  // This function sets up a real-time listener for a single conversation by its ID.
  //  It listens for changes such as new messages, name updates, etc...
  subscribeConversation: ({
    conversationId, // string
    onData, // callback function
    onError // callback function
  }) => {
    if (!conversationId) {
      throw new Error('Conversation id is required');
    }

    const conversationRef = doc(db, 'conversations', conversationId);

    const handleSnapshot = (snapshot) => {
      if (!snapshot.exists()) {
        onData?.(null);
        return;
      }
      onData?.(normalizeConversationDocument(snapshot));
    };

    const handleError = (error) => {
      console.error('Realtime conversation detail listener failed:', error);
      onError?.(error);
    };

    return onSnapshot(
      conversationRef,
      handleSnapshot,
      handleError
    );
  },

createConversation: async (recipientId) => {
    try {
      const token = await getAuthToken();
      // We send a POST request to the conversations endpoint with the recipient's
      //  user ID in the body to create a new conversation.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
          
        }, 
        body: JSON.stringify({ recipientId })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to create conversation';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMsg = errorData.detail;
          }
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMsg);
      }
    // If the conversation is successfully created, we parse and return the new conversation data as JSON.
    // This will include the conversation ID and initial details about the conversation.
      return await response.json();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },

  // This function sets up a real-time listener for messages in a specific conversation.
  subscribeConversationMessages: ({
    conversationId,
    onData,
    onError,
    limit = 200
  }) => {
    if (!conversationId) {
      throw new Error('Conversation id is required');
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limitToLast(limit)
    );

    const handleSnapshot = (snapshot) => {
      const messages = snapshot.docs.map((docSnapshot) =>
        normalizeMessageDocument(docSnapshot, conversationId)
      );
      onData?.(messages);
    };

    const handleError = (error) => {
      console.error('Realtime message listener failed:', error);
      onError?.(error);
    };

    return onSnapshot(
      messagesQuery,
      handleSnapshot,
      handleError
    );
  },

  deleteConversation: async (conversationId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to delete conversation';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMsg = errorData.detail;
          }
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMsg);
      }
      // If the conversation is successfully deleted, we check for a 204 No Content response.
      if (response.status === 204) {
        return null;
      }

      return null;

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  },

  // This function sends a new message in a specific conversation. It takes the conversation ID and message content as parameters,
  // and sends a POST request to the messages endpoint. If successful, it returns the newly created message data as JSON.
  sendMessage: async (conversationId, content) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'

        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to send message';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMsg = errorData.detail;
          }
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMsg);
      }
      // If the message is successfully sent, we parse and return the new message data as JSON.
      //  This will include the message ID, content, sender ID, and timestamps.
      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
,

  // Trigger server-side snapshot rebuild for a conversation.
  // used when the snapshot data is stale and needs to be updated
  syncSnapshots: async (conversationId) => {
    try {
      const token = await getAuthToken();
      // We send a PATCH request to the sync-snapshots endpoint for the conversation.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}/sync-snapshots`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to sync snapshots';
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMsg = errorData.detail;
        } catch {}
        throw new Error(errorMsg);
      }
      // If the sync request is successful, we parse and return the response as JSON.
      return await response.json();
    } catch (error) {
      console.error('Failed to sync snapshots:', error);
      throw error;
    }
  }
};

export default conversationService;





