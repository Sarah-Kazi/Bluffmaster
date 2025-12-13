

import { useEffect, useRef } from 'react';

export const useGameSounds = () => {
    const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

    useEffect(() => {

        soundsRef.current = {
            cardPlay: new Audio('/sounds/card-play.mp3'),
            buttonClick: new Audio('/sounds/button-click.mp3'),
            bluffCall: new Audio('/sounds/bluff-call.mp3'),
            win: new Audio('/sounds/win.mp3'),
            lose: new Audio('/sounds/lose.mp3'),
            shuffle: new Audio('/sounds/shuffle.mp3'),
        };


        Object.values(soundsRef.current).forEach(sound => {
            sound.volume = 0.3;
        });
    }, []);

    const playSound = (soundName: string) => {
        try {
            const sound = soundsRef.current[soundName];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(() => {

                });
            }
        } catch (error) {

        }
    };

    return {
        playCardSound: () => playSound('cardPlay'),
        playButtonSound: () => playSound('buttonClick'),
        playBluffSound: () => playSound('bluffCall'),
        playWinSound: () => playSound('win'),
        playLoseSound: () => playSound('lose'),
        playShuffleSound: () => playSound('shuffle'),
    };
};
