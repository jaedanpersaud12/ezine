import { notFound } from "next/navigation";
import { BookReader } from "@/components/book/BookReader";
import { readLocalManuscript } from "@/lib/server/book";

export const metadata = { title: "Book", robots: { index: false } };

// A private reading copy of a manuscript on this machine, set as a 3D paperback.
// Development only: see lib/server/book.ts.
export default async function BookPage() {
  const source = await readLocalManuscript();
  if (source === null) notFound();
  return (
    <main className="flex-1">
      <BookReader source={source} />
    </main>
  );
}
