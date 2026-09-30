import { Canvas, type TMat2D } from "fabric";

// A Fabric canvas that draws the physical sheet around the artwork:
//   under the objects  → paper (trim + bleed) with a soft drop shadow, and the spread's background
//   over the objects   → the pasteboard dimmed outside the bleed, then trim / bleed / safe / fold guides
// Selection handles are drawn after the overlay (controlsAboveOverlay) so they stay crisp.

export type SheetSpec = {
  widthMm: number;
  heightMm: number;
  pages: number;
  bleedMm: number;
  safeMm: number;
  paper: string;
  background: string | null;
  showGuides: boolean;
  // Colours for chrome, read from the theme's CSS tokens.
  pasteboard: string;
  guide: string;
  accent: string;
};

export type SnapLine = { axis: "x" | "y"; at: number };

export class ZineCanvas extends Canvas {
  sheet: SheetSpec | null = null;
  snapLines: SnapLine[] = [];

  private withViewport(ctx: CanvasRenderingContext2D, draw: (zoom: number) => void): void {
    const v: TMat2D = this.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    draw(v[0]);
    ctx.restore();
  }

  override _renderBackground(ctx: CanvasRenderingContext2D): void {
    super._renderBackground(ctx);
    const s = this.sheet;
    if (!s) return;
    this.withViewport(ctx, (zoom) => {
      const b = s.bleedMm;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = s.paper;
      ctx.fillRect(-b, -b, s.widthMm + b * 2, s.heightMm + b * 2);
      ctx.restore();
      if (s.background) {
        ctx.fillStyle = s.background;
        ctx.fillRect(-b, -b, s.widthMm + b * 2, s.heightMm + b * 2);
      }
      // Spine shading on facing pages, so the fold reads even with guides off.
      if (s.pages === 2) {
        const mid = s.widthMm / 2;
        const g = ctx.createLinearGradient(mid - 6, 0, mid + 6, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.5, "rgba(0,0,0,0.07)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(mid - 6, -b, 12, s.heightMm + b * 2);
      }
      void zoom;
    });
  }

  override _renderOverlay(ctx: CanvasRenderingContext2D): void {
    super._renderOverlay(ctx);
    const s = this.sheet;
    if (!s) return;
    this.withViewport(ctx, (zoom) => {
      const px = 1 / zoom;
      const b = s.bleedMm;

      // Pasteboard: everything outside the bleed is shown faded, not cut, so art can hang off the edge.
      ctx.save();
      ctx.fillStyle = s.pasteboard;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      const inv = this.viewportTransform;
      const x0 = -inv[4] / zoom - 10;
      const y0 = -inv[5] / zoom - 10;
      const x1 = x0 + this.width / zoom + 20;
      const y1 = y0 + this.height / zoom + 20;
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.rect(-b, -b, s.widthMm + b * 2, s.heightMm + b * 2);
      ctx.fill("evenodd");
      ctx.restore();

      if (s.showGuides) {
        ctx.save();
        ctx.lineWidth = px;
        ctx.strokeStyle = s.guide;

        // Trim
        ctx.globalAlpha = 0.9;
        ctx.strokeRect(0, 0, s.widthMm, s.heightMm);

        // Bleed
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([4 * px, 3 * px]);
        ctx.strokeRect(-b, -b, s.widthMm + b * 2, s.heightMm + b * 2);

        // Safe area, per page
        ctx.strokeStyle = s.accent;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([2 * px, 3 * px]);
        const pageW = s.widthMm / s.pages;
        for (let p = 0; p < s.pages; p++) {
          ctx.strokeRect(p * pageW + s.safeMm, s.safeMm, pageW - s.safeMm * 2, s.heightMm - s.safeMm * 2);
        }

        // Fold
        if (s.pages === 2) {
          ctx.setLineDash([6 * px, 4 * px]);
          ctx.strokeStyle = s.guide;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(pageW, -b);
          ctx.lineTo(pageW, s.heightMm + b);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (this.snapLines.length) {
        ctx.save();
        ctx.strokeStyle = s.accent;
        ctx.lineWidth = px;
        for (const line of this.snapLines) {
          ctx.beginPath();
          if (line.axis === "x") {
            ctx.moveTo(line.at, -b - 20);
            ctx.lineTo(line.at, s.heightMm + b + 20);
          } else {
            ctx.moveTo(-b - 20, line.at);
            ctx.lineTo(s.widthMm + b + 20, line.at);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    });
  }
}
