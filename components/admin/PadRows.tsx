// Empty rows of the table's declared height, so a short page is as tall as a full one.
export function PadRows({ count, columns }: { count: number; columns: number }) {
  return Array.from({ length: count }, (_, i) => (
    <tr key={`pad-${i}`} aria-hidden className="h-[var(--row-h)]">
      <td colSpan={columns} />
    </tr>
  ));
}
