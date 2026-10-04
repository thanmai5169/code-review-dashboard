import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useReviewStore } from '../store/reviewStore';
import toast from 'react-hot-toast';

export const useSocket = (reviewId = null) => {
  const socketRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setScanProgress = useReviewStore((state) => state.setScanProgress);
  const appendChatChunk = useReviewStore((state) => state.appendChatChunk);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    // Connect to WebSocket
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      
      // Join user specific room for progress and notifications
      if (user?._id) {
        socket.emit('join_user_room', user._id);
      }

      // Join current review session chat room
      if (reviewId) {
        socket.emit('join_review_chat', reviewId);
      }
    });

    // Listen for AI review scan progress steps
    socket.on('scan_progress', (data) => {
      const { status, percentage } = data;
      setScanProgress({ status, percentage });
    });

    // Listen for follow-up chat response stream chunks
    socket.on('chat_chunk', (data) => {
      appendChatChunk(data.text);
    });

    socket.on('chat_done', (data) => {
      // Stream complete
      console.log('AI chat response stream finished');
    });

    socket.on('chat_error', (data) => {
      toast.error(`Chat error: ${data.error}`);
    });

    // Listen for incoming notifications
    socket.on('notification_received', (data) => {
      toast(`🔔 ${data.message}`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d'
        }
      });
      // Optionally trigger reload or notification state updates
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?._id, token, reviewId, setScanProgress, appendChatChunk]);

  return socketRef.current;
};
export default useSocket;
