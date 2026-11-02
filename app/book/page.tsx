import { notFound } from "next/navigation";
import { BookReader } from "@/components/book/BookReader";
import { listLocalBookImages, readLocalManuscript } from "@/lib/server/book";

export const metadata = { title: "Book", robots: { index: false } };

// A private reading copy of a manuscript on this machine, set as a 3D paperback with its
// pictures. Development only: see lib/server/book.ts.
export default async function BookPage() {
  const source = await readLocalManuscript();
  if (source === null) notFound();
  const images = await listLocalBookImages();
  return (
    <main className="flex-1">
      <BookReader source={source} images={images} />
    </main>
  );
}
