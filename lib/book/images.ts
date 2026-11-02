// The pictures for the /book reader, as URLs: cast sheets in order, chapter stills by chapter number.
export type BookImages = {
  cast: { name: string; url: string }[];
  chapters: Record<number, string[]>;
};
