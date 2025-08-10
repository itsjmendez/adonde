'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionRequest, getConnectionRequests } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/AppLayout';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatAPI } from '@/lib/chat-api';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatParam = searchParams.get('chat');
  const [conversations, setConversations] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
    fetchConversations();

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
      setCurrentUserId(user.id);
      // Initialize ChatAPI for real-time features
      await ChatAPI.initializeSubscriptions(user.id);
    } else {
      setCurrentUserId(null);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await getConnectionRequests('active');

    if (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } else {
      setConversations(data || []);
    }

    setLoading(false);
  };

  const handleConversationSelect = (conversationId: string) => {
    // This will be handled by the ChatLayout component
  };

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Full-screen Chat Layout */}
        <div className="flex-1 min-h-0">
          {currentUserId ? (
            <ChatLayout
              conversations={conversations}
              currentUserId={currentUserId}
              loading={loading}
              onConversationSelect={handleConversationSelect}
              fullScreen={true}
            />
          ) : (
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Loading user session...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
