'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { IoSend, IoStop } from "react-icons/io5";

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '48px';
    if (inputRef.current.scrollHeight > 200) {
      inputRef.current.style.overflowY = 'scroll';
      inputRef.current.style.height = '200px';
    } else {
      inputRef.current.style.overflowY = 'hidden';
      inputRef.current.style.height = inputRef.current.scrollHeight <= 50 ? '48px' : `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Modified sendMessage function
  const sendMessage = async () => {
    if (inputValue.trim() === '') return;
    const newMessage: Message = { text: inputValue, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add an initial 'bot' message with empty text
    setMessages(prevMessages => [...prevMessages, { text: '', sender: 'bot' }]);

    try {
      let responseText = '';
      for await (const fragment of fakeApiCall(newMessage.text)) {
        responseText += fragment;
        // Update the latest 'bot' message with the new fragment
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1].text = responseText;
          return updatedMessages;
        });
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      scrollToBottom();
      document.querySelector('input')?.focus();
    }
  };

  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:max-w-2xl md:m-auto max-h-screen">
      <h1 className="text-4xl font-bold text-center mb-4">Chat App</h1>

      <div className="flex flex-col gap-4 overflow-y-auto w-full flex-grow scrollbar-thin scrollbar-thumb-gray-500">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content mask mask-squircle w-8">
                <span className="text-xs">
                  {message.sender === 'bot' ? '🤖' : '👤'}
                </span>
              </div>
            </div>
            <p className="message-text text-wrap pt-1">{message.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2">
            <span className="loading loading-ring loading-sm"></span>
            <p>Generating...</p>
          </div>
        )}
        <div ref={endOfMessagesRef}></div>
      </div>

      <div className="flex gap-2 mt-4 w-full">
        <textarea
          ref={inputRef}
          placeholder="Type here"
          className={`textarea resize-none textarea-bordered w-full overflow-hidden h-12 ${isLoading && 'input-disabled'}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleEnter}
          disabled={isLoading}
        />
        {isLoading ? (
          <button className="btn btn-error" onClick={() => setIsLoading(false)}><IoStop /></button>
        ) : (
          <button className="btn" onClick={sendMessage}><IoSend /></button>
        )}
      </div>
    </main>
  );
}

// Stub for the fake API call
async function* fakeApiCall(message: string) {
  // This is just a stub. Replace this with your actual API call.
  for (let i = 0; i < message.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 10)); // simulate network delay
    yield message[i]; // yield a fragment of the response
  }
}