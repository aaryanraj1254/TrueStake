import confetti from "canvas-confetti";

const GOLD = ["#F0B429", "#F7C948", "#FEF6E0", "#CB6E17"];

export function fireWinConfetti() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: GOLD });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: GOLD });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function fireRedeemConfetti() {
  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: GOLD,
    scalar: 1.1,
  });
}
