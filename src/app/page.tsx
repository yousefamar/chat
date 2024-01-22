import ChatPanel from './ChatPanel';
import InfoButton from './InfoButton';

export default function Home() {

  return (
    <main className="relative flex flex-col h-full p-3 md:max-w-2xl md:m-auto w-full">
      <h1 className="text-lg sm:text-4xl font-bold text-center mb-4 max-w-full">IslamChat</h1>
      <InfoButton className="absolute top-0 right-0 m-4" />

      <ChatPanel />
    </main>
  );
}