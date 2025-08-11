'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionRequest, Profile, getRequestSenderProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";

interface RequestsLayoutProps {
  requests: ConnectionRequest[];
  currentUserId: string;
  loading: boolean;
  onRequestSelect: (requestId: string) => void;
  onResponse: (requestId: string, response: 'accepted' | 'declined') => void;
  optimisticUpdates: {[key: string]: 'accepting' | 'declining'};
  fullScreen?: boolean;
}

export function RequestsLayout({
  requests,
  currentUserId,
  loading,
  onRequestSelect,
  onResponse,
  optimisticUpdates,
  fullScreen = false,
}: RequestsLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRequest = searchParams.get('request');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRequestClick = (requestId: string) => {
    if (isMobile) {
      router.push(`/requests?request=${requestId}`);
      onRequestSelect(requestId);
    } else {
      router.push(`/requests?request=${requestId}`);
      onRequestSelect(requestId);
    }
  };

  const selectedRequestData = requests.find(
    (req) => req.id === selectedRequest
  );

  if (isMobile) {
    // Mobile: Show either request list OR selected request details
    if (selectedRequest && selectedRequestData) {
      return (
        <div className="h-full flex flex-col">
          <RequestDetails
            request={selectedRequestData}
            currentUserId={currentUserId}
            onResponse={onResponse}
            optimisticUpdates={optimisticUpdates}
          />
        </div>
      );
    }

    // Mobile: Just show the request list
    return (
      <div className="p-4 flex flex-col min-h-0 flex-1">
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            loading ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {requests.length === 0 && !loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500">No pending requests</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {requests.map((request, index) => (
                <div
                  key={request.id}
                  className="animate-in fade-in duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <RequestItem
                    request={request}
                    currentUserId={currentUserId}
                    onClick={() => handleRequestClick(request.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {loading && requests.length === 0 && (
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
      {/* Left Panel - Requests */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white h-full">
        {/* Requests Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Requests</h2>
            <span className="text-sm text-gray-500">
              {requests.length}
            </span>
          </div>
        </div>

        {/* Requests List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={`transition-all duration-300 ease-in-out ${
              loading ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {requests.length === 0 && !loading ? (
              <div className="flex items-center justify-center p-8 min-h-[200px]">
                <p className="text-gray-500">No pending requests</p>
              </div>
            ) : (
              requests.map((request, index) => (
                <div
                  key={request.id}
                  className="animate-in fade-in duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <RequestItem
                    request={request}
                    currentUserId={currentUserId}
                    isSelected={request.id === selectedRequest}
                    onClick={() => handleRequestClick(request.id)}
                  />
                </div>
              ))
            )}
          </div>
          {loading && requests.length === 0 && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Request Details */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedRequest && selectedRequestData ? (
          <RequestDetails
            request={selectedRequestData}
            currentUserId={currentUserId}
            onResponse={onResponse}
            optimisticUpdates={optimisticUpdates}
          />
        ) : (
          <div className="flex-1 bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500">Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Request item for the left panel list
function RequestItem({
  request,
  currentUserId,
  isSelected = false,
  onClick,
}: {
  request: ConnectionRequest;
  currentUserId: string;
  isSelected?: boolean;
  onClick: () => void;
}) {
  const displayName = request.sender_name;
  const avatarUrl = request.sender_avatar_url;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onClick}
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
        {/* Status indicator for pending requests */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-gray-900 truncate">
            {displayName || 'Unknown User'}
          </h3>
          <span className="text-xs text-gray-500 ml-2">
            {formatTimeAgo(request.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {request.message.length > 50 
            ? `${request.message.substring(0, 50)}...`
            : request.message
          }
        </p>
      </div>
    </div>
  );
}

// Request details panel for the right side
function RequestDetails({
  request,
  currentUserId,
  onResponse,
  optimisticUpdates,
}: {
  request: ConnectionRequest;
  currentUserId: string;
  onResponse: (requestId: string, response: 'accepted' | 'declined') => void;
  optimisticUpdates: {[key: string]: 'accepting' | 'declining'};
}) {
  const router = useRouter();
  const [senderProfile, setSenderProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const displayName = request.sender_name;
  const avatarUrl = request.sender_avatar_url;

  // Fetch sender's complete profile
  useEffect(() => {
    const fetchSenderProfile = async () => {
      if (request.sender_id) {
        setProfileLoading(true);
        console.log('Fetching profile for request:', request.id);
        console.log('Full request object:', request);
        
        const { data, error } = await getRequestSenderProfile(request.id);
        console.log('Profile fetch result:', { data, error });
        if (!error && data) {
          setSenderProfile(data);
        } else {
          console.error('Profile fetch error:', error);
          // Set null to indicate we tried but no profile exists
          setSenderProfile(null);
        }
        setProfileLoading(false);
      }
    };

    fetchSenderProfile();
  }, [request.id]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `$${min}+`;
    if (max) return `Up to $${max}`;
    return 'Not specified';
  };

  const formatMoveInDate = (dateString?: string) => {
    if (!dateString) return 'Flexible';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Mobile back button */}
      <div className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 bg-white lg:hidden">
        <button
          onClick={() => router.push('/requests')}
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
        <h3 className="font-semibold text-gray-900">Connection Request</h3>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Profile Header */}
          <div className="text-center">
            <div className="relative inline-block">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'User'}
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mx-auto">
                  <span className="text-white font-semibold text-2xl">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mt-3 mb-1">
              {displayName || 'Unknown User'}
            </h2>
            
            {senderProfile?.age && (
              <p className="text-gray-600">{senderProfile.age} years old</p>
            )}
            
            <p className="text-sm text-gray-500 mt-1">
              Sent {formatTimeAgo(request.created_at)}
            </p>
          </div>

          {/* Profile Loading State */}
          {profileLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : senderProfile ? (
            <>
              {/* Bio */}
              {senderProfile.bio && (
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700 text-sm">{senderProfile.bio}</p>
                </div>
              )}

              {/* Location & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location
                  </h3>
                  <p className="text-sm text-gray-600">
                    {senderProfile.location || 'Not specified'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Budget
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatBudget(senderProfile.rent_budget_min, senderProfile.rent_budget_max)}
                  </p>
                </div>
              </div>

              {/* Move-in Date */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Move-in Timeline
                </h3>
                <p className="text-sm text-gray-600">
                  {formatMoveInDate(senderProfile.move_in_date)}
                </p>
              </div>

              {/* Looking For */}
              {senderProfile.looking_for && senderProfile.looking_for.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Looking For</h3>
                  <div className="flex flex-wrap gap-2">
                    {senderProfile.looking_for.map((item, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              {senderProfile.amenities_wanted && senderProfile.amenities_wanted.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Desired Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {senderProfile.amenities_wanted.map((amenity, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle Preferences */}
              {senderProfile.lifestyle_preferences && Object.keys(senderProfile.lifestyle_preferences).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Lifestyle</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(senderProfile.lifestyle_preferences).map(([key, value]) => {
                      const isPositive = value === true || value === 'yes';
                      const isNegative = value === false || value === 'no';
                      
                      // Convert camelCase to readable labels
                      const getReadableLabel = (key: string) => {
                        const labels: { [key: string]: string } = {
                          smoker: 'Smoker',
                          nightOwl: 'Night Owl',
                          earlyRiser: 'Early Riser',
                          petFriendly: 'Pet Friendly',
                          socialPerson: 'Social Person',
                          quietPerson: 'Quiet Person',
                          cleanliness: 'Cleanliness Level',
                          guestsOk: 'Guests Welcome',
                          partyPerson: 'Likes Parties',
                          workFromHome: 'Works From Home'
                        };
                        return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      };

                      // For boolean values, show as tags
                      if (typeof value === 'boolean') {
                        return isPositive ? (
                          <span key={key} className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm w-fit">
                            ✓ {getReadableLabel(key)}
                          </span>
                        ) : (
                          <span key={key} className="inline-flex items-center bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm w-fit">
                            ✗ {getReadableLabel(key)}
                          </span>
                        );
                      }

                      // For other values, show as key-value pairs
                      return (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-600">{getReadableLabel(key)}:</span>
                          <span className="text-gray-900 font-medium capitalize">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deal Breakers */}
              {senderProfile.deal_breakers && senderProfile.deal_breakers.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Deal Breakers</h3>
                  <div className="flex flex-wrap gap-2">
                    {senderProfile.deal_breakers.map((breaker, index) => (
                      <span
                        key={index}
                        className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm"
                      >
                        {breaker}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-200">
                <h3 className="font-semibold text-gray-900 mb-2">Limited Profile Information</h3>
                <p className="text-gray-600 text-sm">
                  This user hasn't completed their full profile yet. Here's what we know based on their connection request:
                </p>
              </div>
              
              {/* Show basic info we have from the connection request */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="text-gray-900">{displayName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profile Status:</span>
                    <span className="text-orange-600">Incomplete</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> You can still accept this connection request. Once accepted, you can chat with them and they may complete their profile later.
                </p>
              </div>
            </div>
          )}

          {/* Message Section */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2">Connection Message</h3>
            <p className="text-gray-700 italic text-sm">"{request.message}"</p>
          </div>

          {/* Action Buttons */}
          {request.status === 'pending' && (
            <div className="flex gap-3 justify-center pt-4">
              <Button 
                size="lg"
                className="bg-green-600 hover:bg-green-700 px-8"
                onClick={() => onResponse(request.id, 'accepted')}
                disabled={!!optimisticUpdates[request.id]}
              >
                {optimisticUpdates[request.id] === 'accepting' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Accepting...</span>
                  </div>
                ) : (
                  'Accept Request'
                )}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8"
                onClick={() => onResponse(request.id, 'declined')}
                disabled={!!optimisticUpdates[request.id]}
              >
                {optimisticUpdates[request.id] === 'declining' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Declining...</span>
                  </div>
                ) : (
                  'Decline'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}