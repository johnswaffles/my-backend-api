import { useEffect, useRef, useState, type CSSProperties } from 'react';

function getWidgetPanelUrl(): string {
  if (typeof window === 'undefined') return '/widget/panel';
  return new URL('/widget/panel', window.location.origin).toString();
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}

export function WidgetLauncherPage(): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [useMobileLayout, setUseMobileLayout] = useState(isMobileViewport());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  useEffect(() => {
    const handleResize = (): void => setUseMobileLayout(isMobileViewport());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function clamp(value: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, value));
    }

    function stopDrag(): void {
      if (!dragRef.current || !panelRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
      panelRef.current.style.transition = 'opacity 180ms ease, transform 180ms ease';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stopDrag);
    }

    function onMove(event: PointerEvent): void {
      if (!dragRef.current || !panelRef.current || useMobileLayout) return;

      const panel = panelRef.current;
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const nextLeft = clamp(
        dragRef.current.startLeft + (event.clientX - dragRef.current.startX),
        8,
        window.innerWidth - width - 8
      );
      const nextTop = clamp(
        dragRef.current.startTop + (event.clientY - dragRef.current.startY),
        8,
        window.innerHeight - height - 8
      );

      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }

    const header = headerRef.current;
    if (!header) {
      return () => undefined;
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (useMobileLayout) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('button')) return;
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top
      };
      setIsDragging(true);
      panelRef.current.style.transition = 'none';
      panelRef.current.style.left = `${rect.left}px`;
      panelRef.current.style.top = `${rect.top}px`;
      panelRef.current.style.right = 'auto';
      panelRef.current.style.bottom = 'auto';
      header.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', stopDrag, { once: true });
    };

    header.addEventListener('pointerdown', onPointerDown);
    return () => {
      header.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stopDrag);
    };
  }, [useMobileLayout]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const launcherClassName = [
    'fixed z-[10000001] flex items-center gap-2 overflow-hidden rounded-full border px-5 py-3 font-semibold uppercase tracking-[0.08em] text-emerald-950 shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-300 backdrop-blur-xl',
    isOpen
      ? 'right-4 bottom-4 h-14 w-14 justify-center border-emerald-700/20 bg-white/90 p-0 text-stone-800 shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:bg-white'
      : 'left-7 bottom-7 border-emerald-700/15 bg-white/92'
  ].join(' ');

  const panelClassName = [
    'fixed z-[9999999] flex flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/92 shadow-[0_28px_90px_rgba(0,0,0,0.18)] transition-all duration-200 backdrop-blur-2xl',
    isOpen ? 'opacity-100 visible translate-y-0 scale-100 pointer-events-auto' : 'pointer-events-none invisible opacity-0 translate-y-3 scale-[0.98]'
  ].join(' ');

  const panelStyle: CSSProperties = useMobileLayout
    ? {
        left: '8px',
        top: '8px',
        right: '8px',
        bottom: '8px',
        width: 'calc(100vw - 16px)',
        height: 'calc(100vh - 16px)'
      }
      : {
          left: '28px',
          top: 'auto',
          right: 'auto',
          bottom: '28px',
          width: 'min(390px, calc(100vw - 24px))',
          height: 'min(680px, calc(100vh - 24px))'
        };

    return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(250,246,236,0.92)_34%,_rgba(236,244,227,0.98)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,162,98,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(206,179,95,0.14),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.1%27/%3E%3C/svg%3E')] opacity-25" />

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={launcherClassName}
        aria-label={isOpen ? 'Close restaurant widget' : 'Open restaurant widget'}
      >
        <span className={`h-3 w-3 rounded-full bg-emerald-700 ${isOpen ? 'hidden' : 'animate-pulse'}`} />
        <span className={isOpen ? 'text-3xl font-semibold leading-none' : 'text-sm font-bold tracking-wide'}>
          {isOpen ? '-' : 'Find Food'}
        </span>
      </button>

      <div
        className={isOpen ? 'fixed inset-0 z-[9999998] bg-transparent' : 'pointer-events-none fixed inset-0 z-[9999998] bg-transparent'}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <section ref={panelRef} className={panelClassName} style={panelStyle} aria-hidden={!isOpen}>
        <div
          ref={headerRef}
          className={`flex h-12 items-center justify-between border-b border-stone-200 bg-white/95 px-3.5 text-sm text-stone-900 ${
            useMobileLayout ? 'cursor-default' : 'cursor-grab'
          } ${isDragging ? 'select-none' : ''}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-700 shadow-[0_0_8px_rgba(34,197,94,0.55)]" />
            <span className="truncate font-semibold tracking-tight">618FOOD.COM Widget</span>
          </div>
          <div className="flex items-center gap-2">
            {!useMobileLayout ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">Drag</span>
            ) : null}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-lg text-stone-700 transition hover:bg-stone-50"
              aria-label="Close widget"
            >
              ×
            </button>
          </div>
        </div>
        <iframe
          title="618FOOD widget"
          src={getWidgetPanelUrl()}
          allow="autoplay; microphone"
          className="h-full w-full flex-1 border-0 bg-white"
        />
      </section>
    </div>
  );
}
