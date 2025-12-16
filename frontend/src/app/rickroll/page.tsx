"use client";

import { useRouter } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";

export default function RickrollPage() {
  const router = useRouter();
  const { playButtonSound } = useGameSounds();

  const handleBack = () => {
    playButtonSound();
    router.push("/play?gotyou=1");
  };

  return (
    <>
      {/* Animated background */}
      <div className="card-suit-bg">
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
        <div className="card-suit">♣</div>
        <div className="card-suit">♦</div>
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="poker-panel rounded-2xl p-6 backdrop-blur-sm shadow-2xl w-full max-w-4xl">
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={handleBack}
              className="mb-4 px-6 py-2 bg-poker-burgundy hover:bg-poker-burgundy-dark text-poker-gold 
                       font-display font-bold text-lg rounded-lg btn-poker
                       border-2 border-poker-gold/40 hover:border-poker-gold
                       transition-all duration-300 transform hover:scale-105"
            >
              Back to Game
            </button>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-poker-gold text-center">
              Bwahahahah xD
            </h1>
          </div>
          
          <div className="w-full overflow-hidden rounded-xl border-2 border-poker-gold/30">
            <iframe
              className="w-full h-[200px] md:h-[400px] object-cover"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </>
  );
}
