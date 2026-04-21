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
  const rawSnapshots = data?.participant_snapshots;
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
    createdAt: toIsoString(data?.createdAt ?? data?.created_at),
  };
}

const conversationService = {
  getConversations: async (params = {}) => {
    try {
      const token = await getAuthToken();
      const {
        limit = 10,   // default limit is 10 conversations per page
        lastDocId = null,
      } = params;
      //  Here we construct the query parameters for pagination. We include the limit and,
      //  if provided, the lastDocId which indicates where to start the next page of results.
      const urlParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (lastDocId) {
        urlParams.append('last_doc_id', lastDocId);
      }
      // We send the GET request to the conversations endpoint with the appropriate query parameters and authorization header.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations?${urlParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMsg = `Error: ${response.status}`;
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

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      throw error;
    }
  },

  subscribeConversations: (
    currentUserId,
    { onData, onError } = {},
    { limit = 50 } = {}
  ) => {
    if (!currentUserId) {
      throw new Error('No user logged in');
    }

    const conversationsRef = collection(db, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('participant_ids', 'array-contains', currentUserId),
      limitQuery(limit)
    );

    return onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const conversations = snapshot.docs
          .map(normalizeConversationDocument)
          .sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
          });

        onData?.(conversations);
      },
      (error) => {
        console.error('Realtime conversation listener failed:', error);
        onError?.(error);
      }
    );
  },

  getConversation: async (conversationId) => {
    try {
      const token = await getAuthToken();
      // We send a GET request to fetch the details of a specific conversation by its ID, including
      // the authorization token in the header.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMsg = `Error: ${response.status}`;
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
     // If the response is successful, we parse and return the conversation data as JSON to the caller.
     //  This will include details about the conversation such as participant IDs, snapshots, and timestamps.
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      throw error;
    }
  },

  subscribeConversation: (conversationId, { onData, onError } = {}) => {
    if (!conversationId) {
      throw new Error('Conversation id is required');
    }

    const conversationRef = doc(db, 'conversations', conversationId);
    return onSnapshot(
      conversationRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onData?.(null);
          return;
        }

        onData?.(normalizeConversationDocument(snapshot));
      },
      (error) => {
        console.error('Realtime conversation detail listener failed:', error);
        onError?.(error);
      }
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

   // This function fetches messages for a specific conversation, with support for pagination through limit and lastDocId parameters.
   // It is called by the conversation detail view to load messages for the current conversation, and can also be used 
   // to load more messages as the user scrolls up.
  getConversationMessages: async (conversationId, params = {}) => {
    try {
      const token = await getAuthToken();

      const {
        limit = 20, // default limit is 20 messages per page
        lastDocId = null,
      } = params;
         // We construct the query parameters for pagination, including the limit and lastDocId if provided.
      const urlParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (lastDocId) urlParams.append('last_doc_id', lastDocId);
      // We send a GET request to the messages endpoint for the specified conversation,
      //  including the pagination parameters and authorization token.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}/messages?${urlParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to fetch messages';
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
      // If the response is successful, we parse and return the messages data as JSON.
      // This will include an array of messages and a nextPageToken if there are more messages to load.
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  },

  subscribeConversationMessages: (
    conversationId,
    { onData, onError } = {},
    { limit = 200 } = {}
  ) => {
    if (!conversationId) {
      throw new Error('Conversation id is required');
    }

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limitToLast(limit)
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnapshot) =>
          normalizeMessageDocument(docSnapshot, conversationId)
        );
        onData?.(messages);
      },
      (error) => {
        console.error('Realtime message listener failed:', error);
        onError?.(error);
      }
    );
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
};

export default conversationService;





