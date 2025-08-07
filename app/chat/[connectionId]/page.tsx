interface ChatPageProps {
  params: Promise<{ connectionId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { connectionId } = await params;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sarah Chen</h2>
            <p className="text-sm text-green-600 dark:text-green-400">Online</p>
          </div>
          <div className="ml-auto">
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full inline-block">
            Connection established 2 days ago
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm max-w-md">
              <p className="text-sm text-gray-900 dark:text-white">
                Hi! Thanks for accepting my connection request. I'm really excited to potentially be roommates!
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sarah • 2 days ago</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 justify-end">
          <div className="flex-1 flex justify-end">
            <div className="bg-blue-600 rounded-lg p-3 max-w-md">
              <p className="text-sm text-white">
                Hi Sarah! Great to meet you. I'd love to learn more about your preferences and timeline. When are you looking to move?
              </p>
            </div>
          </div>
          <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">You</span>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm max-w-md">
              <p className="text-sm text-gray-900 dark:text-white">
                I'm flexible with timing but ideally looking to move in the next month. I'm currently viewing some places downtown. What about you?
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sarah • 1 day ago</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 justify-end">
          <div className="flex-1 flex justify-end">
            <div className="bg-blue-600 rounded-lg p-3 max-w-md">
              <p className="text-sm text-white">
                That timing works perfectly for me! I've been looking at places in the same area. Would you be interested in viewing some places together?
              </p>
            </div>
          </div>
          <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">You</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}