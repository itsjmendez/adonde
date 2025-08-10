'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionRequest } from '@/lib/profile';
import { ConversationChat } from '@/components/ConversationChat';
import { ChatAPI, Message } from '@/lib/chat-api';

interface ChatLayoutProps {
  conversations: ConnectionRequest[];
  currentUserId: string;
  loading: boolean;
  onConversationSelect: (conversationId: string) => void;
  fullScreen?: boolean;
}

export function ChatLayout({
  conversations,
  currentUserId,
  loading,
  onConversationSelect,
  fullScreen = false,
}: ChatLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedChat = searchParams.get('chat');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleConversationClick = (conversationId: string) => {
    if (isMobile) {
      // Mobile: Update URL to show chat in same component
      const currentPath = window.location.pathname;
      if (currentPath === '/messages') {
        router.push(`/messages?chat=${conversationId}`);
      } else {
        router.push(`/connections?chat=${conversationId}`);
      }
      onConversationSelect(conversationId);
    } else {
      // Desktop: Update URL params to show chat in right panel
      const currentPath = window.location.pathname;
      if (currentPath === '/messages') {
        router.push(`/messages?chat=${conversationId}`);
      } else {
        router.push(`/connections?chat=${conversationId}`);
      }
      onConversationSelect(conversationId);
    }
  };

  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedChat
  );

  if (isMobile) {
    // Mobile: Show either conversation list OR selected chat
    if (selectedChat && selectedConversation) {
      return (
        <div className="h-full flex flex-col">
          <ChatPanel
            conversationId={selectedChat}
            conversation={selectedConversation}
            currentUserId={currentUserId}
          />
        </div>
      );
    }

    // Mobile: Just show the conversation list
    return (
      <div className="p-4 flex flex-col min-h-0 flex-1">
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            loading ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {conversations.length === 0 && !loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500">No conversations yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className="animate-in fade-in duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ConversationItem
                    conversation={conversation}
                    currentUserId={currentUserId}
                    onClick={() => handleConversationClick(conversation.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {loading && conversations.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Two-column WhatsApp-style layout
  return (
    <div
      className={`flex bg-white h-full ${
        fullScreen ? '' : 'border border-gray-200 rounded-lg m-4'
      }`}
    >
      {/* Left Panel - Conversations */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white h-full">
        {/* Conversations Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            <span className="text-sm text-gray-500">
              {conversations.length}
            </span>
          </div>
        </div>

        {/* Conversations List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={`transition-all duration-300 ease-in-out ${
              loading ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {conversations.length === 0 && !loading ? (
              <div className="flex items-center justify-center p-8 min-h-[200px]">
                <p className="text-gray-500">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className="animate-in fade-in duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ConversationItem
                    conversation={conversation}
                    currentUserId={currentUserId}
                    isSelected={conversation.id === selectedChat}
                    onClick={() => handleConversationClick(conversation.id)}
                  />
                </div>
              ))
            )}
          </div>
          {loading && conversations.length === 0 && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedChat ? (
          <ChatPanel
            conversationId={selectedChat}
            conversation={selectedConversation}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="flex-1 bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

// WhatsApp-style conversation item
function ConversationItem({
  conversation,
  currentUserId,
  isSelected = false,
  onClick,
}: {
  conversation: ConnectionRequest;
  currentUserId: string;
  isSelected?: boolean;
  onClick: () => void;
}) {
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  // Determine display name and avatar
  const isCurrentUserSender = currentUserId === conversation.sender_id;
  const displayName = isCurrentUserSender
    ? conversation.receiver_name
    : conversation.sender_name;
  const avatarUrl = isCurrentUserSender
    ? conversation.receiver_avatar_url
    : conversation.sender_avatar_url;

  useEffect(() => {
    let isMounted = true;

    const loadLastMessage = async () => {
      try {
        // Get conversation ID from connection ID
        const convId = await ChatAPI.getConversationByConnectionId(
          conversation.id
        );

        if (!isMounted) return;
        setConversationId(convId);

        if (convId) {
          // Get last message for this conversation
          const message = await ChatAPI.getLastMessage(convId);

          if (!isMounted) return;
          setLastMessage(message);

          // Simple check: if there's a message and it's not from current user, consider it "new"
          if (message && message.sender_id !== currentUserId) {
            setHasUnread(true);
          }
        }
      } catch (error) {
        console.error('Error loading last message:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLastMessage();

    return () => {
      isMounted = false;
    };
  }, [conversation.id, currentUserId]);

  // Separate effect for real-time subscriptions
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (message: Message) => {
      // Update last message
      setLastMessage(message);

      // Mark as unread if message is from other user
      if (message.sender_id !== currentUserId) {
        setHasUnread(true);
      }
    };

    ChatAPI.subscribeToMessages(conversationId, handleNewMessage);

    return () => {
      ChatAPI.unsubscribeFromMessages(conversationId, handleNewMessage);
    };
  }, [conversationId, currentUserId]);

  const handleClick = () => {
    // Clear unread state when user clicks
    setHasUnread(false);
    onClick();
  };

  return (
    <div
      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div className="relative mr-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName || 'User'}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white font-medium text-lg">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3
            className={`truncate ${
              hasUnread
                ? 'font-bold text-gray-900'
                : 'font-medium text-gray-900'
            }`}
          >
            {displayName}
          </h3>
        </div>

        <div className="flex justify-between items-center">
          {loading ? (
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          ) : lastMessage ? (
            <p className="text-sm text-gray-600 truncate">
              {lastMessage.sender_id === currentUserId ? 'You: ' : ''}
              {lastMessage.content}
            </p>
          ) : (
            <p className="text-sm text-blue-600 truncate">
              Start chat with {displayName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Real chat panel using WebSocket ConversationChat component
function ChatPanel({
  conversationId,
  conversation,
  currentUserId,
}: {
  conversationId: string;
  conversation?: ConnectionRequest;
  currentUserId: string;
}) {
  const router = useRouter();
  const [realConversationId, setRealConversationId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert connectionId to conversationId
  useEffect(() => {
    if (conversationId && conversation) {
      const convertId = async () => {
        try {
          setLoading(true);
          setError(null);

          // Try to get conversation ID from connection ID
          const convId = await ChatAPI.getConversationByConnectionId(
            conversationId
          );

          if (convId) {
            setRealConversationId(convId);
          } else {
            // If no conversation exists, create one
            setError('Creating conversation...');
            // For now, show error - we can implement conversation creation later
            setError(
              'Conversation not found. This connection may need to be activated.'
            );
          }
        } catch (err) {
          console.error('Error getting conversation:', err);
          setError('Failed to load conversation');
        } finally {
          setLoading(false);
        }
      };
      convertId();
    }
  }, [conversationId, conversation]);

  if (!conversation || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            {loading ? 'Loading conversation...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to load chat
          </h3>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!realConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No conversation available</p>
        </div>
      </div>
    );
  }

  // Determine user names properly
  const isCurrentUserSender = currentUserId === conversation.sender_id;
  const otherUserName = isCurrentUserSender
    ? conversation.receiver_name
    : conversation.sender_name;
  const currentUserName = isCurrentUserSender
    ? conversation.sender_name
    : conversation.receiver_name;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header - show on mobile - Fixed */}
      <div className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 bg-white lg:hidden">
        <button
          onClick={() => {
            const currentPath = window.location.pathname;
            if (currentPath === '/messages') {
              router.push('/messages');
            } else {
              router.push('/connections');
            }
          }}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex-1 flex items-center">
          {/* Other user's avatar */}
          {(
            isCurrentUserSender
              ? conversation.receiver_avatar_url
              : conversation.sender_avatar_url
          ) ? (
            <img
              src={
                isCurrentUserSender
                  ? conversation.receiver_avatar_url!
                  : conversation.sender_avatar_url!
              }
              alt="User avatar"
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3">
              <span className="text-white font-medium">
                {otherUserName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900">
              {otherUserName || 'User'}
            </h3>
          </div>
        </div>
      </div>

      {/* WebSocket Chat Component - Flexible */}
      <div className="flex-1 min-h-0">
        <ConversationChat
          conversationId={realConversationId}
          currentUserId={currentUserId}
          currentUserName={currentUserName || 'You'}
          otherUserName={otherUserName || 'User'}
        />
      </div>
    </div>
  );
}
