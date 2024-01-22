'use client';

import { useEffect, useState } from "react";
import { GrInstallOption } from "react-icons/gr";

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPrompt(null);
  };

  if (!installPrompt) return null;

  return (<>
    <div className="w-full text-center">
      <button className="btn bg-primary font-bold rounded-full px-16" onClick={handleInstallClick}>
        <GrInstallOption /> Install as app
      </button>
    </div>
  </>
  );
};
