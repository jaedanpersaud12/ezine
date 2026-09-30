// Evaluates what people type into number fields: "12", "12+4", "210/2", "(148-10)*0.5".
// A small recursive-descent parser (no eval). Returns null for anything it can't read.

export function evaluate(input: string): number | null {
  const src = input.replace(/\s+/g, "");
  let i = 0;

  const peek = (): string => src[i] ?? "";

  function number(): number | null {
    const m = /^\d*\.?\d+/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  }

  function factor(): number | null {
    if (peek() === "-") {
      i++;
      const v = factor();
      return v === null ? null : -v;
    }
    if (peek() === "(") {
      i++;
      const v = expression();
      if (peek() !== ")") return null;
      i++;
      return v;
    }
    return number();
  }

  function term(): number | null {
    let v = factor();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = src[i++];
      const r = factor();
      if (r === null) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }

  function expression(): number | null {
    let v = term();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = src[i++];
      const r = term();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const result = expression();
  return result !== null && i === src.length && Number.isFinite(result) ? result : null;
}
