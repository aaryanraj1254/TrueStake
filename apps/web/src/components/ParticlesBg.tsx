import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

// Gold floating dots for the landing hero.
export function ParticlesBg() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        color: { value: "#F0B429" },
        links: { color: "#CB6E17", distance: 140, enable: true, opacity: 0.18, width: 1 },
        move: { enable: true, speed: 0.7, outModes: { default: "out" } },
        number: { density: { enable: true }, value: 70 },
        opacity: { value: { min: 0.2, max: 0.7 } },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 3 } },
      },
      interactivity: {
        events: { onHover: { enable: true, mode: "grab" } },
        modes: { grab: { distance: 160, links: { opacity: 0.4 } } },
      },
      detectRetina: true,
    }),
    [],
  );

  if (!ready) return null;
  return <Particles id="tsparticles" className="absolute inset-0 -z-10" options={options} />;
}
