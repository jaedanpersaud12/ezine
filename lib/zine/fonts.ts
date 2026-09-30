import {
  Anton,
  Archivo_Black,
  Bebas_Neue,
  Bricolage_Grotesque,
  Caveat,
  Courier_Prime,
  DM_Serif_Display,
  Fraunces,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  Libre_Caslon_Text,
  Major_Mono_Display,
  Permanent_Marker,
  Playfair_Display,
  Rock_Salt,
  Rubik_Glitch,
  Rubik_Mono_One,
  Space_Grotesk,
  Special_Elite,
  Syne,
  Unbounded,
  Young_Serif,
} from "next/font/google";

// The zine's type library. Layers store the stable `id`; the CSS family is resolved at render time,
// so rebuilding the app (which renames next/font families) never breaks saved zines.
// Nothing is preloaded: a face downloads the first time a page uses it.
// (next/font needs literal options in every call, hence the repetition.)

const anton = Anton({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const bebas = Bebas_Neue({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false });
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false });
const courier = Courier_Prime({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], style: ["normal", "italic"] });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"] });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700"], style: ["normal", "italic"] });
const instrument = Instrument_Serif({ subsets: ["latin"], display: "swap", preload: false, weight: "400", style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const caslon = Libre_Caslon_Text({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], style: ["normal", "italic"] });
const majorMono = Major_Mono_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const marker = Permanent_Marker({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"] });
const rockSalt = Rock_Salt({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const rubikGlitch = Rubik_Glitch({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const rubikMono = Rubik_Mono_One({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false });
const specialElite = Special_Elite({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const syne = Syne({ subsets: ["latin"], display: "swap", preload: false });
const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false });
const youngSerif = Young_Serif({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });

export type FontCategory = "Sans" | "Serif" | "Display" | "Mono" | "Hand";

export type ZineFont = {
  id: string;
  label: string;
  category: FontCategory;
  family: string;
  // Weights the face actually ships; the UI only offers these.
  weights: number[];
  italic: boolean;
};

const VARIABLE = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function font(
  id: string,
  label: string,
  category: FontCategory,
  face: { style: { fontFamily: string } },
  weights: number[],
  italic: boolean,
): ZineFont {
  return { id, label, category, family: face.style.fontFamily, weights, italic };
}

export const FONTS: ZineFont[] = [
  font("inter", "Inter", "Sans", inter, VARIABLE, true),
  font("space-grotesk", "Space Grotesk", "Sans", spaceGrotesk, [300, 400, 500, 600, 700], false),
  font("bricolage", "Bricolage Grotesque", "Sans", bricolage, [200, 300, 400, 500, 600, 700, 800], false),
  font("syne", "Syne", "Sans", syne, [400, 500, 600, 700, 800], false),
  font("unbounded", "Unbounded", "Display", unbounded, [200, 300, 400, 500, 600, 700, 800, 900], false),
  font("archivo-black", "Archivo Black", "Display", archivoBlack, [400], false),
  font("anton", "Anton", "Display", anton, [400], false),
  font("bebas", "Bebas Neue", "Display", bebas, [400], false),
  font("rubik-mono", "Rubik Mono One", "Display", rubikMono, [400], false),
  font("rubik-glitch", "Rubik Glitch", "Display", rubikGlitch, [400], false),
  font("major-mono", "Major Mono Display", "Display", majorMono, [400], false),
  font("instrument-serif", "Instrument Serif", "Serif", instrument, [400], true),
  font("playfair", "Playfair Display", "Serif", playfair, [400, 500, 600, 700, 800, 900], true),
  font("fraunces", "Fraunces", "Serif", fraunces, VARIABLE, true),
  font("dm-serif", "DM Serif Display", "Serif", dmSerif, [400], true),
  font("young-serif", "Young Serif", "Serif", youngSerif, [400], false),
  font("caslon", "Libre Caslon", "Serif", caslon, [400, 700], true),
  font("special-elite", "Special Elite", "Mono", specialElite, [400], false),
  font("courier-prime", "Courier Prime", "Mono", courier, [400, 700], true),
  font("plex-mono", "IBM Plex Mono", "Mono", plexMono, [400, 500, 700], true),
  font("permanent-marker", "Permanent Marker", "Hand", marker, [400], false),
  font("caveat", "Caveat", "Hand", caveat, [400, 500, 600, 700], false),
  font("rock-salt", "Rock Salt", "Hand", rockSalt, [400], false),
];

export const DEFAULT_FONT_ID = "space-grotesk";

const byId = new Map(FONTS.map((f) => [f.id, f]));

export function builtInFont(id: string): ZineFont | undefined {
  return byId.get(id);
}
