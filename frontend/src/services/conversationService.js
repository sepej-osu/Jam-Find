import { auth } from '../firebase';

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  return user.getIdToken();
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
        } catch (_) {
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
        throw new Error(`Error: ${response.status}`);
      }
     // If the response is successful, we parse and return the conversation data as JSON to the caller.
     //  This will include details about the conversation such as participant IDs, snapshots, and timestamps.
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
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
        } catch (_) {
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
        throw new Error(`Error: ${response.status}`);
      }
      // If the response is successful, we parse and return the messages data as JSON.
      // This will include an array of messages and a nextPageToken if there are more messages to load.
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw new Error('Failed to fetch messages');
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
        } catch (_) {
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





