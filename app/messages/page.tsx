'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionRequest, getConnectionRequests } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/AppLayout';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatAPI } from '@/lib/chat-api';

// Cache conversations to prevent reloading on navigation
let cachedConversations: ConnectionRequest[] = [];
let cachedUserId: string | null = null;
let isInitialized = false;

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatParam = searchParams.get('chat');
  const [conversations, setConversations] = useState<ConnectionRequest[]>(cachedConversations);
  const [loading, setLoading] = useState(!isInitialized);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);

  useEffect(() => {
    const initializeMessages = async () => {
      if (!isInitialized) {
        await getCurrentUser();
        await fetchConversations();
        isInitialized = true;
      } else {
        // Use cached data immediately, refresh in background
        if (cachedUserId) {
          setCurrentUserId(cachedUserId);
          await ChatAPI.initializeSubscriptions(cachedUserId);
        }
        // Refresh conversations in background without loading state
        fetchConversations(false);
      }
    };

    initializeMessages();

    // Cleanup on unmount
    return () => {
      ChatAPI.cleanup();
    };
  }, []);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      cachedUserId = user.id;
      setCurrentUserId(user.id);
      // Initialize ChatAPI for real-time features
      await ChatAPI.initializeSubscriptions(user.id);
    } else {
      cachedUserId = null;
      setCurrentUserId(null);
    }
  };

  const fetchConversations = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    const { data, error } = await getConnectionRequests('active');

    if (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } else {
      const newConversations = data || [];
      cachedConversations = newConversations;
      setConversations(newConversations);
    }

    if (showLoading) {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    // This will be handled by the ChatLayout component
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)]">
        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Chat Layout with viewport height constraint */}
        {currentUserId ? (
          <ChatLayout
            conversations={conversations}
            currentUserId={currentUserId}
            loading={loading}
            onConversationSelect={handleConversationSelect}
            fullScreen={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                </div>
                <p className="text-gray-500 text-sm">Loading user session...</p>
              </div>
            </div>
          )}
        </div>
    </AppLayout>
  );
}
