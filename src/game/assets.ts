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
  variant: number;
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
      style: 'house',
      variant
    };
  }

  if (type === 'shop') {
    const variants = [
      { body: 0xd7d6ca, roof: 0x4a74a0, trim: 0x93c5fd, accent: 0xe0f2fe, label: 'SHOPS' },
      { body: 0xe2d7c7, roof: 0x8c5a42, trim: 0xf5c98f, accent: 0xfef3c7, label: 'BOUTIQUE' },
      { body: 0xd1dce5, roof: 0x40647f, trim: 0xb6d7ea, accent: 0xdbeafe, label: 'MERCANTILE' }
    ][variant % 3];
    return {
      width: 0.82,
      height: 0.72,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'shop',
      variant
    };
  }

  if (type === 'groceryStore') {
    const variants = [
      { body: 0xd5ead3, roof: 0x55754f, trim: 0x93c98a, accent: 0xbbf7d0, label: 'MARKET' },
      { body: 0xe2e7cc, roof: 0x6e7b46, trim: 0xc7d98a, accent: 0xecfccb, label: 'GROCER' },
      { body: 0xd9e4d6, roof: 0x3f6c5b, trim: 0xa7d8c8, accent: 0xccfbf1, label: 'FRESH' }
    ][variant % 3];
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'grocery',
      variant
    };
  }

  if (type === 'cornerStore') {
    const variants = [
      { body: 0xe7d9bc, roof: 0x8b6945, trim: 0xf3bf7f, accent: 0xfde68a, label: 'CORNER' },
      { body: 0xe6d0c3, roof: 0x6a5c54, trim: 0xf5d0b5, accent: 0xffedd5, label: 'MART' },
      { body: 0xdad6c8, roof: 0x57707f, trim: 0xbad5e6, accent: 0xe0f2fe, label: 'STOP' }
    ][variant % 3];
    return {
      width: 0.56,
      height: 0.52,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'corner',
      variant
    };
  }

  if (type === 'restaurant') {
    const variants = [
      { body: 0xe8cfad, roof: 0x9b5a43, trim: 0xf0bb78, accent: 0xfcd34d, label: 'DINER' },
      { body: 0xe1c8b7, roof: 0x7d3f37, trim: 0xf6ad7b, accent: 0xfdba74, label: 'CAFE' },
      { body: 0xe9d3b0, roof: 0x8d6040, trim: 0xf3d08c, accent: 0xfef08a, label: 'GRILL' }
    ][variant % 3];
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'restaurant',
      variant
    };
  }

  if (type === 'bank') {
    const variants = [
      { body: 0xd7dfe8, roof: 0x556782, trim: 0xcfe2ff, accent: 0xe0f2fe, label: 'BANK' },
      { body: 0xe0ddd4, roof: 0x5f5f73, trim: 0xe4e7eb, accent: 0xf8fafc, label: 'TRUST' },
      { body: 0xd4e1df, roof: 0x48666d, trim: 0xc4e4e0, accent: 0xd1fae5, label: 'UNION' }
    ][variant % 3];
    return {
      width: 0.72,
      height: 0.6,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'bank',
      variant
    };
  }

  if (type === 'hospital') {
    const variants = [
      { body: 0xeaf1f7, roof: 0x9db4c8, trim: 0xdbeafe, accent: 0xfca5a5, label: 'HOSPITAL' },
      { body: 0xe6eff0, roof: 0x7ea1b0, trim: 0xcfe8ef, accent: 0xfecaca, label: 'CLINIC' }
    ][variant % 2];
    return {
      width: 0.9,
      height: 0.58,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'hospital',
      variant
    };
  }

  if (type === 'policeStation') {
    const variants = [
      { body: 0xdfe7f0, roof: 0x4b5f79, trim: 0xdbeafe, accent: 0x93c5fd, label: 'POLICE' },
      { body: 0xe4e8ed, roof: 0x5d6475, trim: 0xe2e8f0, accent: 0xbfdbfe, label: 'PRECINCT' }
    ][variant % 2];
    return {
      width: 0.62,
      height: 0.5,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'police',
      variant
    };
  }

  if (type === 'fireStation') {
    const variants = [
      { body: 0xe6c8bf, roof: 0xb04a43, trim: 0xfecaca, accent: 0xfca5a5, label: 'FIRE' },
      { body: 0xe7d2c3, roof: 0x9c5b3c, trim: 0xffd1b5, accent: 0xfdba74, label: 'LADDER' }
    ][variant % 2];
    return {
      width: 0.66,
      height: 0.48,
      palette: { body: variants.body, roof: variants.roof, trim: variants.trim, accent: variants.accent },
      label: variants.label,
      style: 'fire',
      variant
    };
  }

  const powerVariants = [
    { body: 0xa6b4c3, roof: 0x697788, trim: 0xd8e0e6, accent: 0xfde68a, label: 'POWER' },
    { body: 0xb2b7c0, roof: 0x656e7b, trim: 0xe5e7eb, accent: 0xfcd34d, label: 'GRID' }
  ][variant % 2];
  return {
    width: 0.94,
    height: 0.56,
    palette: { body: powerVariants.body, roof: powerVariants.roof, trim: powerVariants.trim, accent: powerVariants.accent },
    label: powerVariants.label,
    style: 'power',
    variant
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
  const variant3 = ((options.variant % 3) + 3) % 3;
  const variant2 = ((options.variant % 2) + 2) % 2;

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

  const windowFill = (y: number, h: number) => {
    const glass = ctx.createLinearGradient(0, y, 0, y + h);
    glass.addColorStop(0, '#fff6c7');
    glass.addColorStop(1, '#d8952a');
    return glass;
  };

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
    ctx.fillStyle = windowFill(y, h);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(76,53,18,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  };

  const drawDoor = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 4, y + 4, w - 8, 8);
    ctx.fillStyle = '#f3d38a';
    ctx.beginPath();
    ctx.arc(x + w - 10, y + h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawAwning = (x: number, y: number, w: number, h: number, stripeColor: string) => {
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = stripeColor;
    for (let sx = x + 4; sx < x + w - 6; sx += 16) {
      ctx.fillRect(sx, y, 7, h);
    }
  };

  const drawBush = (x: number, y: number, radius: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSignBand = (y: number, h: number, textColor: string, font: string) => {
    if (!options.label) return;
    ctx.fillStyle = accent;
    ctx.fillRect(28, y, 200, h);
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillText(options.label, 128, y + h - 8);
  };

  ctx.fillStyle = accent;
  if (options.label) {
    drawSignBand(
      options.style === 'shop' ? 64 : 72,
      options.style === 'shop' ? 34 : 28,
      options.style === 'grocery' ? '#164e2c' : options.style === 'power' ? '#6b4f00' : '#10233b',
      options.style === 'shop' ? '700 28px Manrope' : '700 22px Manrope'
    );
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
    ctx.fillStyle = accent;
    ctx.fillRect(86, 112, 84, 18);
    if (variant3 === 0) {
      drawWindow(54, 128, 46, 42);
      drawWindow(156, 128, 46, 42);
      drawDoor(110, 154, 36, 72, '#7b5636');
    } else if (variant3 === 1) {
      drawWindow(52, 130, 36, 38);
      drawWindow(100, 130, 56, 44);
      drawWindow(168, 130, 32, 38);
      drawDoor(114, 176, 28, 50, '#6f4d30');
      ctx.fillStyle = 'rgba(93,59,25,0.18)';
      ctx.fillRect(42, 180, 172, 8);
    } else {
      drawWindow(58, 132, 54, 50);
      drawWindow(144, 132, 48, 34);
      drawDoor(118, 168, 30, 58, '#845c37');
      ctx.fillStyle = accent;
      ctx.fillRect(148, 116, 42, 12);
    }
    drawBush(48, 214, 10, '#6f9b58');
    drawBush(208, 214, 9, '#7bab63');
  } else if (options.style === 'shop') {
    if (variant3 === 0) {
      drawWindow(46, 124, 164, 38);
      drawWindow(46, 172, 48, 36);
      drawWindow(104, 172, 48, 36);
      drawWindow(162, 172, 48, 36);
      drawDoor(112, 166, 32, 58, '#5a6574');
    } else if (variant3 === 1) {
      drawAwning(42, 118, 172, 18, 'rgba(255,255,255,0.32)');
      drawWindow(48, 140, 60, 62);
      drawWindow(148, 140, 60, 62);
      drawDoor(114, 150, 28, 74, '#82563d');
      drawWindow(66, 100, 28, 24);
      drawWindow(162, 100, 28, 24);
    } else {
      drawWindow(46, 132, 54, 76);
      drawWindow(156, 132, 54, 76);
      drawDoor(106, 144, 44, 80, '#46607b');
      ctx.fillStyle = accent;
      ctx.fillRect(86, 108, 84, 12);
      ctx.fillStyle = '#10233b';
      ctx.fillRect(124, 112, 8, 100);
    }
  } else if (options.style === 'grocery' || options.style === 'corner') {
    const isCorner = options.style === 'corner';
    if (variant3 === 0) {
      drawWindow(46, 128, 72, 76);
      drawWindow(138, 128, 72, 76);
      drawDoor(112, 154, 32, 70, isCorner ? '#6b5846' : '#4b6a4d');
    } else if (variant3 === 1) {
      drawAwning(40, 116, 176, 16, 'rgba(255,255,255,0.28)');
      drawWindow(48, 136, 54, 68);
      drawDoor(110, 144, 36, 80, isCorner ? '#7b5a49' : '#52734d');
      drawWindow(154, 136, 54, 52);
      ctx.fillStyle = 'rgba(86,52,22,0.2)';
      ctx.fillRect(154, 194, 54, 10);
    } else {
      drawWindow(44, 136, 84, 68);
      drawWindow(144, 136, 66, 68);
      drawDoor(116, 162, 26, 62, isCorner ? '#556470' : '#45625b');
      ctx.fillStyle = accent;
      ctx.fillRect(52, 108, 152, 10);
    }
    ctx.fillStyle = accent;
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(40 + i * 28, 108, 14, 12);
    }
  } else if (options.style === 'restaurant') {
    if (variant3 === 0) {
      drawWindow(38, 136, 180, 64);
      ctx.fillStyle = '#9f4b24';
      ctx.beginPath();
      ctx.arc(128, 108, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6c453';
      ctx.beginPath();
      ctx.arc(128, 102, 30, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (variant3 === 1) {
      drawAwning(44, 126, 168, 16, 'rgba(255,255,255,0.28)');
      drawWindow(48, 146, 60, 56);
      drawDoor(114, 142, 28, 82, '#764636');
      drawWindow(148, 146, 60, 56);
      ctx.fillStyle = accent;
      ctx.fillRect(92, 96, 72, 12);
    } else {
      drawWindow(46, 142, 164, 56);
      drawDoor(112, 156, 32, 68, '#7b5330');
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(128, 114, 34, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8b3b1f';
      ctx.fillRect(102, 114, 52, 10);
    }
  } else if (options.style === 'hospital') {
    for (const x of [52, 106, 160]) {
      drawWindow(x, 124, 44, 34);
      drawWindow(x, 168, 44, 34);
    }
    if (variant2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(116, 110, 24, 84);
      ctx.fillRect(86, 140, 84, 24);
    } else {
      drawAwning(86, 144, 84, 16, 'rgba(255,255,255,0.22)');
      drawDoor(112, 160, 32, 64, '#7a8d9d');
      ctx.fillStyle = accent;
      ctx.fillRect(100, 112, 56, 20);
      ctx.fillStyle = '#a61b1b';
      ctx.fillRect(122, 114, 12, 16);
      ctx.fillRect(114, 122, 28, 8);
    }
  } else if (options.style === 'police') {
    if (variant2 === 0) {
      drawWindow(52, 136, 56, 50);
      drawWindow(148, 136, 56, 50);
      ctx.fillStyle = '#0f3b72';
      ctx.fillRect(114, 120, 28, 86);
    } else {
      drawWindow(46, 130, 72, 58);
      drawDoor(118, 150, 20, 74, '#405369');
      drawWindow(142, 130, 68, 58);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(128, 104);
      ctx.lineTo(154, 116);
      ctx.lineTo(148, 146);
      ctx.lineTo(128, 156);
      ctx.lineTo(108, 146);
      ctx.lineTo(102, 116);
      ctx.closePath();
      ctx.fill();
    }
  } else if (options.style === 'fire') {
    if (variant2 === 0) {
      ctx.fillStyle = '#8b1e1e';
      ctx.fillRect(44, 130, 72, 92);
      ctx.fillRect(140, 130, 72, 92);
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(52, 140, 56, 10);
      ctx.fillRect(148, 140, 56, 10);
    } else {
      ctx.fillStyle = '#8b1e1e';
      ctx.fillRect(52, 132, 56, 90);
      ctx.fillRect(120, 150, 30, 72);
      ctx.fillRect(162, 132, 42, 90);
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(60, 140, 40, 10);
      ctx.fillRect(167, 140, 32, 10);
      ctx.fillRect(126, 158, 18, 48);
    }
  } else if (options.style === 'power') {
    if (variant2 === 0) {
      ctx.fillStyle = '#d0d8e0';
      ctx.fillRect(42, 132, 96, 78);
      ctx.fillStyle = '#9caab9';
      ctx.fillRect(150, 120, 58, 90);
      ctx.fillStyle = '#ffefb3';
      ctx.fillRect(86, 154, 26, 32);
      ctx.fillStyle = '#7f8a93';
      ctx.fillRect(178, 70, 18, 100);
    } else {
      ctx.fillStyle = '#c9d1d9';
      ctx.fillRect(38, 140, 84, 70);
      ctx.fillRect(134, 148, 40, 62);
      ctx.fillStyle = '#8794a0';
      ctx.fillRect(178, 96, 26, 114);
      ctx.fillRect(146, 118, 18, 92);
      ctx.fillStyle = '#ffe68a';
      ctx.fillRect(58, 154, 42, 28);
      ctx.fillStyle = '#dde5ec';
      ctx.fillRect(114, 162, 18, 14);
    }
  }

  ctx.fillStyle = 'rgba(140,108,72,0.18)';
  ctx.fillRect(44, 212, 168, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(40, 100, 176, 8);

  if (options.style !== 'power' && options.style !== 'hospital') {
    drawBush(64, 220, 7, 'rgba(96,146,86,0.85)');
    drawBush(190, 220, 6, 'rgba(110,155,96,0.8)');
  }

  ctx.strokeStyle = 'rgba(15,23,42,0.14)';
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 94, 188, 130);

  return true;
}

export function paintAssetSideCard(canvas: HTMLCanvasElement, options: AssetCardOptions): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  canvas.width = 192;
  canvas.height = 256;

  const body = palette(options.palette.body);
  const roof = palette(options.palette.roof);
  const trim = palette(options.palette.trim);
  const accent = palette(options.palette.accent);
  const variant = ((options.variant % 3) + 3) % 3;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const shadow = ctx.createRadialGradient(96, 226, 14, 96, 226, 66);
  shadow.addColorStop(0, 'rgba(15,23,42,0.22)');
  shadow.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(96, 224, 62, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  const wallGrad = ctx.createLinearGradient(0, 70, 0, 228);
  wallGrad.addColorStop(0, trim);
  wallGrad.addColorStop(1, body);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(34, 78, 124, 142);

  const roofGrad = ctx.createLinearGradient(0, 24, 0, 92);
  roofGrad.addColorStop(0, roof);
  roofGrad.addColorStop(1, trim);
  ctx.fillStyle = roofGrad;
  ctx.fillRect(24, 28, 144, 62);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(40 + i * 24, 34, 12, 48);
  }

  const drawWindow = (x: number, y: number, w: number, h: number) => {
    const glass = ctx.createLinearGradient(0, y, 0, y + h);
    glass.addColorStop(0, '#fff4c8');
    glass.addColorStop(1, '#db9d31');
    ctx.fillStyle = glass;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(76,53,18,0.24)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };

  const drawServiceStripe = () => {
    ctx.fillStyle = accent;
    ctx.fillRect(48, 102, 96, 10);
    ctx.fillStyle = 'rgba(15,23,42,0.12)';
    ctx.fillRect(48, 118, 96, 6);
  };

  if (options.style === 'house') {
    drawWindow(52, 126, 28, 44);
    drawWindow(98, 142, 22, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(44, 186, 92, 8);
  } else if (options.style === 'shop' || options.style === 'grocery' || options.style === 'corner' || options.style === 'restaurant') {
    drawServiceStripe();
    drawWindow(48, 132, 38, 64);
    drawWindow(98, 132, 42, variant === 1 ? 48 : 64);
    ctx.fillStyle = accent;
    ctx.fillRect(44, 206, 102, 8);
  } else if (options.style === 'bank') {
    drawServiceStripe();
    for (const x of [56, 82, 108, 134]) {
      ctx.fillStyle = trim;
      ctx.fillRect(x, 114, 10, 94);
    }
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(62, 142, 72, 12);
  } else if (options.style === 'hospital') {
    drawServiceStripe();
    for (const y of [126, 170]) {
      drawWindow(48, y, 28, 28);
      drawWindow(84, y, 28, 28);
      drawWindow(120, y, 28, 28);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(88, 122, 20, 86);
  } else if (options.style === 'police') {
    drawServiceStripe();
    drawWindow(50, 134, 38, 56);
    drawWindow(102, 134, 38, 56);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(96, 112);
    ctx.lineTo(118, 124);
    ctx.lineTo(112, 148);
    ctx.lineTo(96, 156);
    ctx.lineTo(80, 148);
    ctx.lineTo(74, 124);
    ctx.closePath();
    ctx.fill();
  } else if (options.style === 'fire') {
    drawServiceStripe();
    ctx.fillStyle = '#922525';
    ctx.fillRect(52, 130, 32, 84);
    ctx.fillRect(92, 144, 24, 70);
    ctx.fillRect(124, 130, 22, 84);
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(58, 138, 20, 8);
    ctx.fillRect(128, 138, 14, 8);
  } else if (options.style === 'power') {
    ctx.fillStyle = '#cfd7dd';
    ctx.fillRect(44, 140, 56, 70);
    ctx.fillRect(106, 150, 26, 60);
    ctx.fillStyle = '#8b98a6';
    ctx.fillRect(136, 104, 18, 106);
    ctx.fillStyle = accent;
    ctx.fillRect(56, 156, 28, 22);
  }

  ctx.strokeStyle = 'rgba(15,23,42,0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 80, 120, 138);

  return true;
}

export function paintHeroAsset(canvas: HTMLCanvasElement, options: AssetCardOptions): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const frontCanvas = document.createElement('canvas');
  const sideCanvas = document.createElement('canvas');
  if (!paintAssetCard(frontCanvas, options) || !paintAssetSideCard(sideCanvas, options)) {
    return false;
  }

  canvas.width = 512;
  canvas.height = 512;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const accent = palette(options.palette.accent);
  const roof = palette(options.palette.roof);
  const trim = palette(options.palette.trim);
  const style = options.style;

  const drawDiamond = (cx: number, cy: number, w: number, h: number, fill: string, stroke?: string) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - w, cy);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const shadow = ctx.createRadialGradient(256, 420, 30, 256, 420, 170);
  shadow.addColorStop(0, 'rgba(15,23,42,0.2)');
  shadow.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(256, 420, 168, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  const lotFill =
    style === 'house'
      ? '#9fcb8e'
      : style === 'power'
        ? '#c6cfd5'
        : style === 'hospital' || style === 'police' || style === 'fire'
          ? '#dbd8d2'
          : '#e3d9c9';
  drawDiamond(256, 382, style === 'hospital' || style === 'power' ? 154 : 118, style === 'hospital' || style === 'power' ? 74 : 58, lotFill, 'rgba(15,23,42,0.08)');

  if (style !== 'house') {
    drawDiamond(256, 398, style === 'hospital' || style === 'power' ? 122 : 94, style === 'hospital' || style === 'power' ? 38 : 30, '#dfe4e7');
  } else {
    drawDiamond(256, 398, 92, 26, '#d4c4a3');
  }

  ctx.save();
  ctx.translate(166, 116);
  ctx.transform(0.92, 0.18, 0, 0.82, 0, 0);
  ctx.drawImage(frontCanvas, 0, 0, 210, 246);
  ctx.restore();

  ctx.save();
  ctx.translate(280, 128);
  ctx.transform(0.62, -0.18, 0, 0.82, 0, 0);
  ctx.drawImage(sideCanvas, 0, 0, 154, 246);
  ctx.restore();

  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(212, 166);
  ctx.lineTo(304, 148);
  ctx.lineTo(364, 182);
  ctx.lineTo(274, 202);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(216, 168);
  ctx.lineTo(300, 152);
  ctx.lineTo(348, 180);
  ctx.lineTo(274, 196);
  ctx.closePath();
  ctx.fill();

  if (style === 'restaurant') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(276, 156, 24, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b3b1f';
    ctx.fillRect(256, 156, 42, 8);
  }

  if (style === 'bank') {
    ctx.fillStyle = trim;
    ctx.fillRect(236, 182, 60, 10);
    ctx.fillRect(246, 194, 8, 54);
    ctx.fillRect(278, 194, 8, 54);
  }

  if (style === 'hospital') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(250, 188, 24, 54);
    ctx.fillRect(236, 202, 52, 24);
  }

  if (style === 'police') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(262, 188);
    ctx.lineTo(282, 198);
    ctx.lineTo(278, 220);
    ctx.lineTo(262, 228);
    ctx.lineTo(246, 220);
    ctx.lineTo(242, 198);
    ctx.closePath();
    ctx.fill();
  }

  if (style === 'fire') {
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(232, 194, 42, 10);
    ctx.fillRect(284, 194, 26, 10);
  }

  if (style === 'power') {
    ctx.fillStyle = '#8493a2';
    ctx.fillRect(330, 140, 20, 138);
    ctx.fillRect(356, 154, 16, 124);
    ctx.fillStyle = accent;
    ctx.fillRect(228, 252, 32, 20);
  }

  if (style === 'house') {
    ctx.fillStyle = '#7bab63';
    ctx.beginPath();
    ctx.arc(188, 404, 18, 0, Math.PI * 2);
    ctx.arc(328, 400, 16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#a17c55';
    ctx.fillRect(202, 372, 18, 18);
    ctx.fillRect(312, 368, 18, 18);
    ctx.fillStyle = '#7aa468';
    ctx.beginPath();
    ctx.arc(211, 368, 14, 0, Math.PI * 2);
    ctx.arc(321, 364, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  return true;
}
