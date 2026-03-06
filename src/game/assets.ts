import type { BuildType } from './state';

export type AssetCardStyle =
  | 'house'
  | 'shop'
  | 'grocery'
  | 'corner'
  | 'restaurant'
  | 'bank'
  | 'hospital'
  | 'police'
  | 'fire'
  | 'power';

export interface AssetCardOptions {
  width: number;
  height: number;
  palette: { body: number; roof: number; trim: number; accent: number };
  label: string;
  style: AssetCardStyle;
}

function palette(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

export function getAssetCardOptions(type: BuildType, variant = 0): AssetCardOptions | null {
  if (type === 'road' || type === 'park' || type === 'workshop') return null;

  if (type === 'house') {
    const bodies = [0xd7b38f, 0xe7cfb3, 0xc79e72, 0xdab0a7, 0xc8b38f];
    const roofs = [0x7d5a46, 0x8c5a4b, 0x5d6675, 0x845b40, 0x4f566d];
    const trims = [0xe8d2b4, 0xf0ddc2, 0xd8bf9d, 0xf1d0ca, 0xe5d8bf];
    return {
      width: 0.62,
      height: 0.56,
      palette: {
        body: bodies[variant % bodies.length],
        roof: roofs[variant % roofs.length],
        trim: trims[variant % trims.length],
        accent: 0xfff3c4
      },
      label: '',
      style: 'house'
    };
  }

  if (type === 'shop') {
    return {
      width: 0.82,
      height: 0.72,
      palette: { body: 0xd7d6ca, roof: 0x4a74a0, trim: 0x93c5fd, accent: 0xe0f2fe },
      label: 'SHOPS',
      style: 'shop'
    };
  }

  if (type === 'groceryStore') {
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: 0xd5ead3, roof: 0x55754f, trim: 0x93c98a, accent: 0xbbf7d0 },
      label: 'MARKET',
      style: 'grocery'
    };
  }

  if (type === 'cornerStore') {
    return {
      width: 0.56,
      height: 0.52,
      palette: { body: 0xe7d9bc, roof: 0x8b6945, trim: 0xf3bf7f, accent: 0xfde68a },
      label: 'CORNER',
      style: 'corner'
    };
  }

  if (type === 'restaurant') {
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: 0xe8cfad, roof: 0x9b5a43, trim: 0xf0bb78, accent: 0xfcd34d },
      label: 'DINER',
      style: 'restaurant'
    };
  }

  if (type === 'bank') {
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: 0xd7dfe8, roof: 0x556782, trim: 0xcfe2ff, accent: 0xe0f2fe },
      label: 'BANK',
      style: 'bank'
    };
  }

  if (type === 'hospital') {
    return {
      width: 0.9,
      height: 0.58,
      palette: { body: 0xeaf1f7, roof: 0x9db4c8, trim: 0xdbeafe, accent: 0xfca5a5 },
      label: 'HOSPITAL',
      style: 'hospital'
    };
  }

  if (type === 'policeStation') {
    return {
      width: 0.62,
      height: 0.5,
      palette: { body: 0xdfe7f0, roof: 0x4b5f79, trim: 0xdbeafe, accent: 0x93c5fd },
      label: 'POLICE',
      style: 'police'
    };
  }

  if (type === 'fireStation') {
    return {
      width: 0.66,
      height: 0.48,
      palette: { body: 0xe6c8bf, roof: 0xb04a43, trim: 0xfecaca, accent: 0xfca5a5 },
      label: 'FIRE',
      style: 'fire'
    };
  }

  return {
    width: 0.94,
    height: 0.56,
    palette: { body: 0xa6b4c3, roof: 0x697788, trim: 0xd8e0e6, accent: 0xfde68a },
    label: 'POWER',
    style: 'power'
  };
}

export function paintAssetCard(canvas: HTMLCanvasElement, options: AssetCardOptions): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  canvas.width = 256;
  canvas.height = 256;

  const body = palette(options.palette.body);
  const roof = palette(options.palette.roof);
  const trim = palette(options.palette.trim);
  const accent = palette(options.palette.accent);

  ctx.clearRect(0, 0, 256, 256);

  const shadow = ctx.createRadialGradient(128, 230, 10, 128, 230, 80);
  shadow.addColorStop(0, 'rgba(15,23,42,0.26)');
  shadow.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(128, 228, 82, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  const background = ctx.createLinearGradient(0, 30, 0, 230);
  background.addColorStop(0, 'rgba(255,255,255,0.08)');
  background.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = background;
  ctx.fillRect(28, 18, 200, 200);

  const roofGrad = ctx.createLinearGradient(0, 18, 0, 92);
  roofGrad.addColorStop(0, roof);
  roofGrad.addColorStop(1, trim);
  ctx.fillStyle = roofGrad;
  ctx.fillRect(18, 20, 220, 66);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = -20; i < 280; i += 24) {
    ctx.fillRect(i, 18, 14, 58);
  }

  ctx.fillStyle = body;
  ctx.fillRect(32, 92, 192, 136);

  ctx.fillStyle = trim;
  ctx.fillRect(40, 100, 176, 124);

  const drawWindow = (x: number, y: number, w: number, h: number) => {
    const glass = ctx.createLinearGradient(0, y, 0, y + h);
    glass.addColorStop(0, '#fff3b0');
    glass.addColorStop(1, '#d7a73a');
    ctx.fillStyle = glass;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(76,53,18,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  };

  ctx.fillStyle = accent;
  if (options.label) {
    ctx.fillRect(28, options.style === 'shop' ? 66 : 72, 200, options.style === 'shop' ? 34 : 28);
    ctx.fillStyle = options.style === 'grocery' ? '#164e2c' : options.style === 'power' ? '#6b4f00' : '#10233b';
    ctx.font = options.style === 'shop' ? '700 28px Manrope' : '700 22px Manrope';
    ctx.textAlign = 'center';
    ctx.fillText(options.label, 128, options.style === 'shop' ? 92 : 91);
  }

  if (options.style === 'bank') {
    ctx.fillStyle = trim;
    for (const x of [60, 98, 136, 174]) ctx.fillRect(x, 112, 18, 102);
    ctx.fillStyle = accent;
    ctx.fillRect(66, 82, 124, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 23px Manrope';
    ctx.fillText(options.label, 128, 95);
  }

  if (options.style === 'house') {
    drawWindow(54, 128, 46, 42);
    drawWindow(156, 128, 46, 42);
    ctx.fillStyle = '#7b5636';
    ctx.fillRect(110, 154, 36, 72);
    ctx.fillStyle = accent;
    ctx.fillRect(92, 116, 72, 18);
  } else if (options.style === 'shop') {
    drawWindow(44, 126, 168, 36);
    drawWindow(44, 172, 48, 36);
    drawWindow(104, 172, 48, 36);
    drawWindow(164, 172, 48, 36);
  } else if (options.style === 'grocery' || options.style === 'corner') {
    drawWindow(46, 128, 72, 76);
    drawWindow(138, 128, 72, 76);
    ctx.fillStyle = accent;
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(40 + i * 28, 108, 14, 12);
    }
  } else if (options.style === 'restaurant') {
    drawWindow(38, 136, 180, 64);
    ctx.fillStyle = '#9f4b24';
    ctx.beginPath();
    ctx.arc(128, 108, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6c453';
    ctx.beginPath();
    ctx.arc(128, 102, 30, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (options.style === 'hospital') {
    drawWindow(52, 124, 44, 34);
    drawWindow(106, 124, 44, 34);
    drawWindow(160, 124, 44, 34);
    drawWindow(52, 168, 44, 34);
    drawWindow(106, 168, 44, 34);
    drawWindow(160, 168, 44, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(116, 110, 24, 84);
    ctx.fillRect(86, 140, 84, 24);
  } else if (options.style === 'police') {
    drawWindow(52, 136, 56, 50);
    drawWindow(148, 136, 56, 50);
    ctx.fillStyle = '#0f3b72';
    ctx.fillRect(114, 120, 28, 86);
  } else if (options.style === 'fire') {
    ctx.fillStyle = '#8b1e1e';
    ctx.fillRect(44, 130, 72, 92);
    ctx.fillRect(140, 130, 72, 92);
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(52, 140, 56, 10);
    ctx.fillRect(148, 140, 56, 10);
  } else if (options.style === 'power') {
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(42, 132, 96, 78);
    ctx.fillStyle = '#9caab9';
    ctx.fillRect(150, 120, 58, 90);
    ctx.fillStyle = '#ffefb3';
    ctx.fillRect(86, 154, 26, 32);
    ctx.fillStyle = '#7f8a93';
    ctx.fillRect(178, 70, 18, 100);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(40, 100, 176, 8);

  ctx.strokeStyle = 'rgba(15,23,42,0.14)';
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 94, 188, 130);

  return true;
}
