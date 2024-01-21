'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { IoSend, IoStop } from "react-icons/io5";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

export async function* chat(message: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.body) throw new Error("ReadableStream not yet supported in this browser.");

  const reader = res.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield new TextDecoder().decode(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export default function ChatPanel() {
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
    endOfMessagesRef.current?.scrollIntoView();
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
      for await (const fragment of chat(newMessage.text)) {
        responseText += fragment;
        // Update the latest 'bot' message with the new fragment
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1].text = responseText;
          return updatedMessages;
        });
        scrollToBottom();
      }
      console.log('Success:', responseText);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      scrollToBottom();
      document.querySelector('input')?.focus();
    }
  };

  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  return <>
    <div className="flex flex-col gap-4 overflow-y-auto w-full flex-grow scrollbar-thin scrollbar-thumb-gray-500">
      {messages.map((message, index) => <div key={index} className="flex items-start gap-4">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content mask mask-squircle w-8">
            <span className="text-xs">
              {message.sender === 'bot' ? '🤖' : '👤'}
            </span>
          </div>
        </div>
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="message-text text-wrap">{message.text}</ReactMarkdown>
        </div> 
      </div>)}
      {isLoading && <div className="flex items-center gap-2">
        <span className="loading loading-ring loading-sm"></span>
        <p>Generating...</p>
      </div>}
      <div ref={endOfMessagesRef}></div>
    </div>

    <div className="flex gap-2 mt-4 w-full">
      <textarea
        ref={inputRef}
        placeholder="Type here"
        className={`textarea resize-none textarea-bordered w-full overflow-hidden h-12`}
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleEnter}
        />
      {isLoading ? (
        <button className="btn btn-error" onClick={() => setIsLoading(false)}><IoStop /></button>
      ) : (
        <button className="btn" onClick={sendMessage}><IoSend /></button>
      )}
    </div>
  </>;
}