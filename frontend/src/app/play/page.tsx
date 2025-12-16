"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Volume2, VolumeX } from "lucide-react";
import { useGameSounds } from "@/hooks/useGameSounds";
import YouTube from "react-youtube";

const BACKGROUND_MUSIC_ID = "PaFHwTjy1yE";

function PlayEntryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rickrolled, setRickrolled] = useState(searchParams.get("gotyou") === "1");
  const { playButtonSound } = useGameSounds();

  const adMessages = [
    "🔥Sophia (24) is just 200 m away - chat now!",
    "🎁You've won a FREE iPhone! Claim before midnight!",
    "🎉Contact me for astrology predictions - guaranteed results!",
  ];
  type Ad = { id: number; text: string };
  const [ads, setAds] = useState<Ad[]>([]);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const musicPlayerRef = useRef<any>(null);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  // Close volume slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update YouTube player volume when musicVolume changes
  useEffect(() => {
    if (musicPlayerRef.current) {
      musicPlayerRef.current.setVolume(musicVolume);
    }
  }, [musicVolume]);

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

  const toggleMusicMute = () => {
    if (musicPlayerRef.current) {
      if (isMusicMuted) {
        musicPlayerRef.current.unMute();
        musicPlayerRef.current.setVolume(musicVolume);
      } else {
        musicPlayerRef.current.mute();
      }
      setIsMusicMuted(!isMusicMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setMusicVolume(newVolume);
    if (newVolume > 0 && isMusicMuted) {
      setIsMusicMuted(false);
      if (musicPlayerRef.current) {
        musicPlayerRef.current.unMute();
      }
    }
  };

  const onMusicReady = (event: any) => {
    musicPlayerRef.current = event.target;
    event.target.setVolume(musicVolume);
    if (!isMusicMuted) {
      event.target.playVideo();
    }
  };

  const closeAd = (id: number) => {
    setAds((prev) => prev.filter((ad) => ad.id !== id));
  };

  const goToRickroll = () => {
    router.replace("/rickroll");
  };

  const goToHome = () => {
    playButtonSound();
    router.push("/");
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

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        {/* Hidden YouTube Player */}
        <div className="hidden">
          <YouTube
            videoId={BACKGROUND_MUSIC_ID}
            onReady={onMusicReady}
            opts={{
              playerVars: {
                autoplay: 1,
                loop: 1,
                playlist: BACKGROUND_MUSIC_ID,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
              },
            }}
          />
        </div>

        {/* Volume Control */}
        <div className="fixed top-4 right-4 z-20" ref={volumeControlRef}>
          <div className="relative">
            <button
              onClick={toggleMusicMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="p-2.5 bg-poker-wood/80 hover:bg-poker-wood text-poker-gold 
                       rounded-full btn-poker border border-poker-gold/30 hover:border-poker-gold
                       transition-all duration-200 shadow-lg flex items-center justify-center"
              title={isMusicMuted ? "Unmute Music" : "Mute Music"}
            >
              {isMusicMuted || musicVolume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            
            {showVolumeSlider && (
              <div 
                className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 p-3 bg-poker-wood/90 backdrop-blur-sm rounded-lg shadow-xl border border-poker-gold/20"
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <div className="w-32 h-6 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-poker-gold/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-poker-gold [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-in-out [&::-webkit-slider-thumb]:hover:scale-125"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-center space-y-8">
          {!rickrolled ? (
            <div className="space-y-6 animate-fade-in">
              {/* Decorative top */}
              <div className="flex justify-center space-x-4 mb-8">
                <div className="text-6xl text-poker-gold opacity-60 animate-float">♠</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float-delayed">♥</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float">♦</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float-delayed">♣</div>
              </div>

              {/* Main PLAY button */}
              <button
                onClick={goToHome}
                className="group relative px-20 py-8 bg-poker-burgundy hover:bg-poker-burgundy-dark 
                         text-poker-gold font-display font-bold text-5xl rounded-2xl 
                         border-4 border-poker-gold hover:border-poker-gold-dark
                         shadow-2xl hover:shadow-poker-gold/30
                          transition-all duration-300
                         
                         overflow-hidden"
              >
                <span className="relative z-10 tracking-wider drop-shadow-lg">PLAY</span>

                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                              transform -skew-x-12 -translate-x-full group-hover:translate-x-full 
                              transition-transform duration-1000"></div>
              </button>

              {/* Subtitle */}
              <p className="text-gray-300 text-lg font-light tracking-wide">

              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Decorative top */}
              <div className="flex justify-center space-x-4 mb-8">
                <div className="text-6xl text-poker-gold opacity-60 animate-float">♠</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float-delayed">♥</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float">♦</div>
                <div className="text-6xl text-poker-gold opacity-60 animate-float-delayed">♣</div>
              </div>

              <h1 className="text-5xl font-display font-bold text-poker-gold mb-6">
                Hahahaa! Got You :D
              </h1>

              {/* Main button matching PLAY style */}
              <button
                onClick={goToHome}
                className="group relative px-20 py-8 bg-poker-burgundy hover:bg-poker-burgundy-dark 
                         text-poker-gold font-display font-bold text-5xl rounded-2xl 
                         border-4 border-poker-gold
                         shadow-2xl hover:shadow-poker-gold/30
                          transition-all duration-300
                         
                         overflow-hidden"
              >
                <span className="relative z-10 tracking-wider drop-shadow-lg">Play Now</span>

                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                              transform -skew-x-12 -translate-x-full group-hover:translate-x-full 
                              transition-transform duration-1000"></div>
              </button>
            </div>
          )}
        </div>

        {/* Fake ads popup */}
        <div className="fixed bottom-4 right-4 flex flex-col items-end gap-4 z-50">
          {ads.map((ad) => (
            <div
              key={ad.id}
              onClick={goToRickroll}
              className="popup-card relative w-80 pointer-events-auto 
                       bg-poker-burgundy border-2 border-poker-gold/50 
                       text-white p-5 rounded-xl shadow-2xl 
                       cursor-pointer hover:scale-105 hover:border-poker-gold
                       transition-all duration-300"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeAd(ad.id);
                }}
                className="absolute -right-2 -top-2 bg-poker-wood border-2 border-poker-gold 
                         p-1.5 rounded-full hover:bg-black hover:scale-110 
                         transition-all duration-200"
                aria-label="Close ad"
              >
                <X className="w-4 h-4 text-poker-gold" />
              </button>
              <p className="font-semibold leading-snug text-sm pr-4">{ad.text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function PlayEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-poker-gold font-display">Loading...</div>
      </div>
    }>
      <PlayEntryPageContent />
    </Suspense>
  );
}