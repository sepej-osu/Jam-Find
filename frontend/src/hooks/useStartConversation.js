import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toaster } from '../components/ui/toaster';
import conversationService from '../services/conversationService';

export function useStartConversation() {
  const [messagingInProgress, setMessagingInProgress] = useState(false);
  const navigate = useNavigate();

  const handleStartConversation = async (targetUserId) => {
    if (messagingInProgress) return;

    try {
      setMessagingInProgress(true);
      const conversation = await conversationService.createConversation(targetUserId);
      navigate(`/messages/${conversation.conversationId}`);
    } catch (err) {
      toaster.create({
        title: 'Unable to start conversation',
        description: err.message || 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setMessagingInProgress(false);
    }
  };

  return { messagingInProgress, handleStartConversation };
}
