import ChatPanel from './ChatPanel';

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:max-w-2xl md:m-auto max-h-screen">
      <h1 className="text-4xl font-bold text-center mb-4">Chat App</h1>

      <ChatPanel />

    </main>
  );
}