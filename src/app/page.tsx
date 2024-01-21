import ChatPanel from './ChatPanel';
import InfoButton from './InfoButton';

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:max-w-2xl md:m-auto max-h-screen">
      <h1 className="text-4xl font-bold text-center mb-4">IslamChat</h1>
      <InfoButton className="absolute top-0 right-0 m-4" />

      <ChatPanel />
    </main>
  );
}