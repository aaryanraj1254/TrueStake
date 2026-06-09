import { Howl } from "howler";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "truestake:bgm";

interface BgmCtx {
  playing: boolean;
  toggle: () => void;
}

const Ctx = createContext<BgmCtx>({ playing: false, toggle: () => {} });

// A short royalty-free casino-style loop. Swap the src for your own asset.
const BGM_SRC = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749e2c2.mp3?filename=lounge-jazz.mp3";

export function BgmProvider({ children }: { children: ReactNode }) {
  const howl = useRef<Howl | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    howl.current = new Howl({ src: [BGM_SRC], loop: true, volume: 0.25, html5: true });
    if (localStorage.getItem(KEY) === "on") {
      howl.current.play();
      setPlaying(true);
    }
    return () => {
      howl.current?.unload();
    };
  }, []);

  const toggle = () => {
    const h = howl.current;
    if (!h) return;
    if (playing) {
      h.pause();
      localStorage.setItem(KEY, "off");
      setPlaying(false);
    } else {
      h.play();
      localStorage.setItem(KEY, "on");
      setPlaying(true);
    }
  };

  return <Ctx.Provider value={{ playing, toggle }}>{children}</Ctx.Provider>;
}

export const useBGM = () => useContext(Ctx);
