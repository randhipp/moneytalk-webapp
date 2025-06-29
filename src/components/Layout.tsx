import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, DollarSign, User, Download } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MoneyTalk
              </h1>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                {/* Bolt Icon */}
                <button
                  onClick={() => window.open('https://bolt.new', '_blank')}
                  className="flex items-center justify-center w-[60px] h-[60px] hover:opacity-80 transition-opacity"
                  title="Built with Bolt"
                >
                  <img
                    src="https://raw.githubusercontent.com/kickiniteasy/bolt-hackathon-badge/3f09b71855feb7d3c02ed170ccae764b842cf4ce/src/public/bolt-badge/white_circle_360x360/white_circle_360x360.png"
                    alt="Built with Bolt"
                    className="w-[40px] h-[40px] object-contain"
                  />
                </button>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}