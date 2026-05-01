// Shooting-star spawner. Pure DOM module — no astronomy dependency.
// Meteors enter at a random viewport point, streak across at a realistic
// angle, then fade. Self-paused while the tab is hidden or `enabled()` returns
// false (e.g. during daylight).

interface SpawnOptions {
	container: HTMLElement;
	// Mean seconds between meteors. Per-spawn jitter is 0.4×..2.5× this value.
	intervalSeconds: number;
	// Streak length in vw. Larger values = longer trail.
	length?: number;
	// Color of the streak head.
	color?: string;
	// Optional gate. Returning false skips the spawn but keeps the schedule alive.
	enabled?: () => boolean;
}

let stylesInjected = false;

function ensureStyles(): void {
	if (stylesInjected) return;
	const style = document.createElement("style");
	style.textContent = `
		.sky-meteor {
			position: fixed;
			height: 1.5px;
			background: linear-gradient(to right, transparent, currentColor 90%, #fff);
			border-radius: 999px;
			transform-origin: 100% 50%;
			opacity: 0;
			pointer-events: none;
			z-index: -5;
			filter: drop-shadow(0 0 6px currentColor);
			animation: sky-meteor-streak var(--meteor-dur, 1.2s) cubic-bezier(0.2, 0.9, 0.4, 1) forwards;
			will-change: transform, opacity;
		}
		@keyframes sky-meteor-streak {
			0%   { opacity: 0; transform: rotate(var(--meteor-ang, -35deg)) translateX(40px); }
			15%  { opacity: 1; }
			100% { opacity: 0; transform: rotate(var(--meteor-ang, -35deg)) translateX(-55vw); }
		}
		@media (prefers-reduced-motion: reduce) {
			.sky-meteor { animation: none; opacity: 0; }
		}
	`;
	document.head.appendChild(style);
	stylesInjected = true;
}

export function startShootingStars(opts: SpawnOptions): () => void {
	ensureStyles();
	const {
		container,
		intervalSeconds,
		length = 22,
		color = "#fff",
		enabled = () => true,
	} = opts;
	let stopped = false;

	function nextDelayMs(): number {
		const u = Math.random();
		return intervalSeconds * (0.4 + u * 2.1) * 1000;
	}

	function spawn(): void {
		if (stopped) return;
		if (document.visibilityState !== "visible" || !enabled()) {
			schedule();
			return;
		}

		const meteor = document.createElement("div");
		meteor.className = "sky-meteor";
		meteor.setAttribute("aria-hidden", "true");
		const startX = 10 + Math.random() * 80;
		const startY = 5 + Math.random() * 55;
		const direction = Math.random() < 0.5 ? -1 : 1;
		const ang = (25 + Math.random() * 30) * direction;
		const dur = 0.7 + Math.random() * 1.1;

		meteor.style.left = `${startX.toFixed(2)}vw`;
		meteor.style.top = `${startY.toFixed(2)}vh`;
		meteor.style.width = `${length}vw`;
		meteor.style.color = color;
		meteor.style.setProperty("--meteor-ang", `${ang.toFixed(1)}deg`);
		meteor.style.setProperty("--meteor-dur", `${dur.toFixed(2)}s`);

		container.appendChild(meteor);
		setTimeout(() => meteor.remove(), Math.ceil(dur * 1000) + 250);
		schedule();
	}

	function schedule(): void {
		if (stopped) return;
		setTimeout(spawn, nextDelayMs());
	}

	setTimeout(spawn, 1500 + Math.random() * 3000);

	return () => {
		stopped = true;
	};
}
