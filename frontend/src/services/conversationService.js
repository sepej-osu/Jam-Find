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
        limit = 10,
        lastDocId = null,
      } = params;

      const urlParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (lastDocId) {
        urlParams.append('last_doc_id', lastDocId);
      }

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

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
  },

createConversation: async (recipientId) => {
    try {
      const token = await getAuthToken();

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

      return await response.json();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },

  getConversationMessages: async (conversationId, params = {}) => {
    try {
      const token = await getAuthToken();

      const {
        limit = 20,
        lastDocId = null,
      } = params;

      const urlParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (lastDocId) urlParams.append('last_doc_id', lastDocId);

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

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw new Error('Failed to fetch messages');
    }
  },

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

      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
};

export default conversationService;





