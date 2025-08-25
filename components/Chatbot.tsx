import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Message, Role } from '../types';

// Web Speech API type definitions for browsers that support it.
// This is necessary because these types are not included in the default
// TypeScript DOM library definitions.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const ModelIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.564-1.858 6.012 6.012 0 011.858-1.564L6.96 6.043a4.014 4.014 0 00-1.414 1.414l-1.214.57zM15.668 11.973a6.012 6.012 0 01-1.564 1.858 6.012 6.012 0 01-1.858 1.564l1.214-1.435a4.014 4.014 0 001.414-1.414l.8-1.573zM10 4.005a6.002 6.002 0 015.668 7.968l-1.214-1.435A4.002 4.002 0 0010 6.005V4.005z" clipRule="evenodd" />
    </svg>
);

const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
    </svg>
);

const SpeakerOnIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
);

const SpeakerOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
);

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: Role.MODEL, content: "Hello! I'm a Gemini-powered chatbot. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a friendly and helpful chatbot integrated into a website. Provide clear, concise, and helpful answers.',
        },
      });
      setChat(chatSession);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to initialize the chatbot. Please check the API key.');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition is not supported by this browser.');
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event.error);
    };
    window.speechSynthesis.speak(utterance);
  }, [isSpeechEnabled]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: Role.USER, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    let finalModelResponse = '';

    try {
      const stream = await chat.sendMessageStream({ message: inputValue });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: Role.MODEL, content: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = modelResponse;
            return newMessages;
        });
      }
      finalModelResponse = modelResponse;

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      finalModelResponse = `I'm sorry, an error occurred: ${errorMessage}`;
      setMessages(prev => [...prev, { role: Role.ERROR, content: `Error: ${errorMessage}` }]);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      if (finalModelResponse) {
          speak(finalModelResponse);
      }
    }
  }, [inputValue, isLoading, chat, speak]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-12rem)] w-full max-w-4xl mx-auto bg-gray-800/60 rounded-xl shadow-2xl border border-gray-700/50 backdrop-blur-lg">
      <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === Role.USER ? 'justify-end' : ''}`}>
            {msg.role === Role.MODEL && <ModelIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />}
            
            <div className={`px-4 py-3 rounded-2xl max-w-lg whitespace-pre-wrap ${
              msg.role === Role.USER ? 'bg-indigo-600 text-white rounded-br-none' :
              msg.role === Role.MODEL ? 'bg-gray-700 text-gray-200 rounded-bl-none' :
              'bg-red-500/20 text-red-300 border border-red-500/50 rounded-bl-none'
            }`}>
              {msg.content || (msg.role === Role.MODEL && <span className="animate-pulse">...</span>)}
            </div>

            {msg.role === Role.USER && <UserIcon className="w-8 h-8 text-gray-400 flex-shrink-0 mt-1" />}
          </div>
        ))}
        {isLoading && messages[messages.length - 1].role === Role.USER && (
          <div className="flex items-start gap-4">
            <ModelIcon className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
            <div className="px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && !messages.some(m => m.role === Role.ERROR) && (
        <div className="px-6 pb-2 text-sm text-red-400">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="p-4 border-t border-gray-700/50">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-4">
          <button
            type="button"
            onClick={() => setIsSpeechEnabled(prev => !prev)}
            className="p-3 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors text-gray-400 flex-shrink-0"
            aria-label={isSpeechEnabled ? "Disable voice output" : "Enable voice output"}
          >
            {isSpeechEnabled ? <SpeakerOnIcon className="h-6 w-6" /> : <SpeakerOffIcon className="h-6 w-6" />}
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isRecording ? "Listening..." : (chat ? "Type or say something..." : "Initializing chatbot...")}
            disabled={isLoading || !chat}
            className="flex-1 w-full px-4 py-3 bg-gray-700/80 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200 placeholder-gray-400 disabled:opacity-50 transition-shadow"
            autoFocus
          />
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={isLoading || !chat}
            className={`p-3 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors disabled:opacity-50 flex-shrink-0 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <MicIcon className="h-6 w-6" />
          </button>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !chat}
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all transform hover:scale-105 active:scale-95 disabled:hover:scale-100 flex-shrink-0"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
