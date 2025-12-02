"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

function PlayEntryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rickrolled, setRickrolled] = useState(searchParams.get("gotyou") === "1");


  const adMessages = [
    "🔥 Sophia (24) is just 200 m away – chat now!",
    "🔮 Contact me for astrology predictions – guaranteed results!",
    "🎁 You've won a FREE iPhone! Claim before midnight!",
  ];
  type Ad = { id: number; text: string };
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    adMessages.forEach((text, i) => {
      timers.push(
        setTimeout(() => {
          setAds((prev) => [...prev, { id: i, text }]);
        }, (i + 1) * 1000)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const closeAd = (id: number) => {
    setAds((prev) => prev.filter((ad) => ad.id !== id));
  };

  const goToRickroll = () => {
    router.replace("/rickroll");
  };

  const goToHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        {!rickrolled ? (
          <>
            <button
              onClick={goToHome}
              className="px-12 py-4 bg-white text-black font-bold text-xl rounded-lg hover:bg-gray-200 transition-colors"
            >
              PLAY
            </button>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold">hahahaha got you :D</h1>
            <button
              onClick={goToHome}
              className="px-10 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Play
            </button>
          </>
        )}
      </div>
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-4 z-50">
        {ads.map((ad) => (
          <div
            key={ad.id}
            onClick={goToRickroll}
            className="popup-card relative w-72 pointer-events-auto bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white p-4 rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-transform"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeAd(ad.id);
              }}
              className="absolute -right-2 -top-2 bg-black/60 p-1 rounded-full hover:bg-black/80 transition-colors"
              aria-label="Close ad"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-semibold leading-snug text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{ad.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayEntryPageContent />
    </Suspense>
  );
}
