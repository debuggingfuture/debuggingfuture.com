export interface Geo {
	lat: number;
	lon: number;
	name?: string;
}

export type TwilightPhase =
	| "day"
	| "goldenHour"
	| "civilTwilight"
	| "nauticalTwilight"
	| "astronomicalTwilight"
	| "night";

export interface SkyState {
	time: Date;
	geo: Geo;
	sun: { altitude: number; azimuth: number };
	moon: { altitude: number; azimuth: number; phase: number; illumination: number; angle: number; distance: number };
	twilight: TwilightPhase;
	localSiderealTime: number; // hours, 0..24
	cssVars: Record<string, string>;
}

export interface StarRecord {
	name: string;
	ra: number; // hours
	dec: number; // degrees
	mag: number; // apparent visual magnitude
	ci: number; // B-V color index
}

export interface StarRender extends StarRecord {
	altitude: number; // degrees
	azimuth: number; // degrees, 0=N, 90=E
	x: number; // viewport fraction 0..1
	y: number; // viewport fraction 0..1
	color: string; // CSS color from B-V
	visible: boolean;
}
