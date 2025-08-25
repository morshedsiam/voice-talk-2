
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg w-full z-10 sticky top-0">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.564-1.858 6.012 6.012 0 011.858-1.564L6.96 6.043a4.014 4.014 0 00-1.414 1.414l-1.214.57zM15.668 11.973a6.012 6.012 0 01-1.564 1.858 6.012 6.012 0 01-1.858 1.564l1.214-1.435a4.014 4.014 0 001.414-1.414l.8-1.573zM10 4.005a6.002 6.002 0 015.668 7.968l-1.214-1.435A4.002 4.002 0 0010 6.005V4.005z" clipRule="evenodd" />
            </svg>
            <h1 className="text-xl font-bold ml-3 text-white">Gemini Chat</h1>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Home</a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">About</a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Contact</a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
