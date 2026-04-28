import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FOOD_BRAND } from './features/local-eats/schemas';

const CONTACT_API_BASE_URL = 'https://johnny-chat.onrender.com';

type ContactStatus = {
  kind: 'idle' | 'sending' | 'success' | 'error';
  message: string;
};

function getContactApiBase(): string {
  if (typeof window === 'undefined') return CONTACT_API_BASE_URL;
  const override = (window as Window & { JOHNNY_CONTACT_API_BASE_URL?: string }).JOHNNY_CONTACT_API_BASE_URL;
  return String(override || CONTACT_API_BASE_URL).replace(/\/+$/, '');
}

function getNormalizedPathname(): string {
  if (typeof window === 'undefined') return '/';
  const normalized = window.location.pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function navigateTo(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function BrandHeader({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
        618
      </div>
      <div>
        <div className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
          {FOOD_BRAND}
        </div>
        <div className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-500">
          {compact ? 'Project archive' : 'Voice restaurant finder archive'}
        </div>
      </div>
    </div>
  );
}

function ArchiveNav(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-900">
        Live tools offline
      </span>
      <a
        href="/contact"
        onClick={(event) => {
          event.preventDefault();
          navigateTo('/contact');
        }}
        className="rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
      >
        Contact Johnny
      </a>
    </div>
  );
}

function ProductArtifact(): JSX.Element {
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[2.4rem] border border-stone-200/70 bg-[#12281f] p-4 text-white shadow-[0_32px_90px_rgba(18,40,31,0.32)] sm:p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:38px_38px]" />

      <div className="relative flex h-full flex-col gap-4 rounded-[2rem] border border-white/10 bg-black/20 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Archived interface</div>
            <div className="mt-1 font-display text-2xl font-semibold tracking-tight">Voice to writeup flow</div>
          </div>
          <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
            Offline
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4">
            <div className="mx-auto grid h-36 w-36 grid-cols-8 gap-1 rounded-[1.7rem] border border-emerald-200/20 bg-[#07140f] p-3 shadow-[0_0_42px_rgba(52,211,153,0.22)]">
              {Array.from({ length: 64 }).map((_, index) => {
                const active = [18, 19, 20, 27, 28, 29, 35, 36, 43, 44, 45].includes(index);
                const warm = [37, 38, 46].includes(index);
                return (
                  <span
                    key={index}
                    className={`rounded-[0.2rem] ${
                      active
                        ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]'
                        : warm
                          ? 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.75)]'
                          : 'bg-white/20'
                    }`}
                  />
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-stone-300">User asked</div>
              <p className="mt-2 text-sm font-semibold text-white">"Best tacos near Salem, Illinois"</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.5rem] border border-emerald-200/20 bg-emerald-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-emerald-100">
                Top spot writeup
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-50">
                #1 pick: a focused local recommendation with the why, the mood, and the useful details a plain list
                never gives you.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-stone-300">Mode</div>
                <div className="mt-1 text-lg font-black">Voice + text</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-stone-300">Result</div>
                <div className="mt-1 text-lg font-black">Readable</div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200/20 bg-amber-100/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-100">Cost pressure</span>
                <span className="text-xs font-black text-amber-100">High</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
                <div className="h-full w-[86%] rounded-full bg-[linear-gradient(90deg,#34d399,#facc15,#fb923c)]" />
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-200">
                The right call was to archive it before the experiment became an open tab on the wallet.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto grid gap-3 sm:grid-cols-4">
          {['Ask', 'Rank', 'Write', 'Read'].map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <div className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                0{index + 1}
              </div>
              <div className="mt-1 text-sm font-black">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectStoryPage(): JSX.Element {
  const builtItems = [
    {
      label: 'Local intent',
      text: 'Understood a town, food type, or a specific restaurant request without making the user learn a special format.'
    },
    {
      label: 'Voice plus text',
      text: 'Let users speak naturally while still getting a readable answer they could scan afterward.'
    },
    {
      label: 'Editorial writeup',
      text: 'Generated a polished #1 recommendation that felt like a useful local note, not a raw search result.'
    },
    {
      label: 'Spoken playback',
      text: 'Read the writeup aloud so the experience could work hands-free, almost like a tiny local guide.'
    }
  ];

  const proofItems = [
    'Real-time voice UX can feel friendly and surprisingly natural in a local search product.',
    'Restaurant discovery is better when the answer explains why a place is a good fit, not just where it is.',
    'The technical build worked; the limiting factor was operating cost, not whether the app could be made.'
  ];

  const timelineItems = [
    ['01', 'Ask naturally', 'A user could say a town and craving or name a specific restaurant.'],
    ['02', 'Gather context', 'The system looked for useful details, not just a generic list.'],
    ['03', 'Pick a winner', 'It elevated the best fit and gave the user a clear top choice.'],
    ['04', 'Tell the story', 'The answer became a short, polished writeup with a human rhythm.'],
    ['05', 'Retire cleanly', 'The live tools were shut off before costs could keep climbing.']
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(255,248,233,0.92)_30%,_rgba(236,246,232,0.96)_66%,_rgba(248,241,229,1)_100%)] text-stone-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(14,122,85,0.2),_transparent_28%),radial-gradient(circle_at_78%_12%,_rgba(240,151,55,0.28),_transparent_24%),radial-gradient(circle_at_48%_88%,_rgba(117,74,35,0.13),_transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(90deg,#173528_1px,transparent_1px),linear-gradient(#173528_1px,transparent_1px)] [background-size:46px_46px]" />
      <div className="pointer-events-none absolute left-[-10rem] top-28 h-72 w-72 rounded-full border border-emerald-700/10" />
      <div className="pointer-events-none absolute right-[-7rem] top-52 h-56 w-56 rotate-12 rounded-[4rem] border border-amber-700/10" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/75 bg-white/80 px-4 py-4 shadow-[0_22px_70px_rgba(65,53,36,0.13)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <BrandHeader />
            <ArchiveNav />
          </div>
        </header>

        <section className="grid items-stretch gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/75 bg-white/90 p-7 shadow-[0_28px_80px_rgba(65,53,36,0.16)] backdrop-blur-2xl sm:p-10">
            <div className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-10 h-32 w-72 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-900">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-[0_0_18px_rgba(5,150,105,0.8)]" />
                Project laid to rest
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-[0.92] tracking-tight text-[#123321] sm:text-6xl lg:text-7xl">
                A very capable local restaurant finder was built here.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600 sm:text-xl">
                618FOOD.COM became a voice-first local discovery experiment: users could ask for a town and a craving,
                get a strong #1 recommendation, read a thoughtful writeup, and hear that writeup spoken back to them.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
                The technology worked. The experience was real. The reason it is offline now is practical: the APIs and
                live services needed to run it well are still expensive enough that keeping it active is not sensible for a
                hobbyist project.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ['Built', 'Voice + text'],
                  ['Output', '#1 writeup'],
                  ['Status', 'Archived']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 shadow-sm">
                    <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-stone-500">{label}</div>
                    <div className="mt-1 text-lg font-black text-[#173528]">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="/contact"
                  onClick={(event) => {
                    event.preventDefault();
                    navigateTo('/contact');
                  }}
                  className="inline-flex justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-black text-white shadow-[0_18px_36px_rgba(22,83,44,0.24)] transition hover:bg-emerald-800"
                >
                  Contact Johnny about this project
                </a>
                <span className="text-sm font-semibold text-stone-500">
                  The contact form remains live; the food search tools do not.
                </span>
              </div>
            </div>
          </div>

          <ProductArtifact />
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {builtItems.map((item, index) => (
            <div
              key={item.label}
              className="group rounded-[2rem] border border-white/75 bg-white/80 p-5 shadow-[0_20px_55px_rgba(65,53,36,0.11)] backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(22,83,44,0.15)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173528] text-sm font-black text-emerald-50 shadow-[0_12px_28px_rgba(23,53,40,0.18)]">
                {index + 1}
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-[#173528]">{item.label}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-[0_20px_55px_rgba(65,53,36,0.11)] backdrop-blur-2xl sm:p-7">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">What this proved</div>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#173528]">The user experience had a pulse.</h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-stone-600">
              {proofItems.map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-stone-200/70 bg-white/70 p-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-[0_20px_55px_rgba(65,53,36,0.11)] backdrop-blur-2xl sm:p-7">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">How the experience worked</div>
            <div className="mt-5 grid gap-3">
              {timelineItems.map(([step, title, text]) => (
                <div key={step} className="grid gap-3 rounded-2xl border border-stone-200/75 bg-white/75 p-4 sm:grid-cols-[4.5rem_1fr]">
                  <div className="font-display text-3xl font-semibold text-emerald-800">{step}</div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#173528]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.4rem] border border-emerald-900/10 bg-[linear-gradient(135deg,#173528,#24543f_52%,#8b5e2e)] p-1 shadow-[0_30px_80px_rgba(23,53,40,0.22)]">
          <div className="grid gap-6 rounded-[2.2rem] border border-white/15 bg-white/10 p-6 text-white backdrop-blur sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-100">Current status</div>
              <h2 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Archived with respect, not erased.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-100 sm:text-base">
                The public search, voice widget, and restaurant tools are intentionally disabled. This page now serves as
                a record of what was achieved, why it was set down, and how a good idea can still matter even when it is
                not meant to keep running forever.
              </p>
            </div>
            <a
              href="/contact"
              onClick={(event) => {
                event.preventDefault();
                navigateTo('/contact');
              }}
              className="inline-flex justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-emerald-950 shadow-[0_18px_36px_rgba(0,0,0,0.18)] transition hover:bg-emerald-50"
            >
              Contact Johnny
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function ContactPage(): JSX.Element {
  const [contactStatus, setContactStatus] = useState<ContactStatus>({ kind: 'idle', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmittingContact(true);
    setContactStatus({ kind: 'sending', message: 'Sending your message...' });

    try {
      const response = await fetch(`${getContactApiBase()}/api/contact`, {
        method: 'POST',
        body: formData
      });

      let payload: { ok?: boolean; error?: string; detail?: string } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = {};
      }

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || payload.detail || 'The message could not be sent yet.');
      }

      form.reset();
      setContactStatus({
        kind: 'success',
        message: 'Thanks. Your message was sent to Johnny.'
      });
    } catch (error) {
      setContactStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.'
      });
    } finally {
      setSubmittingContact(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(250,246,236,0.9)_34%,_rgba(236,244,227,0.98)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(17,120,82,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(238,160,54,0.16),_transparent_28%)]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <BrandHeader compact />
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateTo('/');
              }}
              className="w-fit rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-bold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              Back to project story
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-[0_24px_70px_rgba(49,67,38,0.14)] backdrop-blur-2xl sm:p-8">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
              Contact Johnny
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-[#173528] sm:text-5xl">
              Want to ask about the 618FOOD experiment?
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
              The live restaurant finder is retired, but you can still reach Johnny about the project, the voice
              interface, the writeup workflow, or a related idea.
            </p>
            <div className="mt-7 grid gap-3 text-sm leading-6 text-stone-600 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <strong className="block text-emerald-950">Project questions</strong>
                Ask what was built and how it worked.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <strong className="block text-emerald-950">Technical notes</strong>
                Talk voice, text, search, or cost tradeoffs.
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white/100 p-4">
                <strong className="block text-emerald-950">Future ideas</strong>
                Share a practical reason to revisit it.
              </div>
            </div>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="rounded-[2rem] border border-white/75 bg-white/90 p-5 shadow-[0_24px_70px_rgba(49,67,38,0.14)] backdrop-blur-2xl sm:p-7"
          >
            <input type="hidden" name="profile" value="food" />
            <input
              type="hidden"
              name="page_url"
              value={typeof window === 'undefined' ? '618FOOD.COM contact page' : window.location.href}
            />

            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Simple message form
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[#173528]">
                Send Johnny the details.
              </h2>
              <p className="text-sm leading-6 text-stone-600">
                Name, email, message. Add a phone number or file only if it helps.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Phone</span>
                <input
                  name="phone"
                  autoComplete="tel"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Optional"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Topic</span>
                <select
                  name="topic"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  defaultValue="Project question"
                >
                  <option>Project question</option>
                  <option>Technical discussion</option>
                  <option>Collaboration idea</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">
                  Project or organization name
                </span>
                <input
                  name="company"
                  autoComplete="organization"
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Optional"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">Message</span>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="mt-2 w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base leading-7 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Tell Johnny what you would like to know about 618FOOD.COM, the voice interface, the restaurant writeup workflow, or the retired build."
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-stone-600">
                  Optional files or screenshots
                </span>
                <input
                  name="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="mt-2 w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                />
                <span className="mt-2 block text-xs leading-5 text-stone-500">
                  Optional. Useful if you are referencing a screenshot, idea, or technical note.
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submittingContact}
                className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(22,83,44,0.22)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingContact ? 'Sending...' : 'Send message'}
              </button>
              <div
                aria-live="polite"
                className={`text-sm font-semibold ${
                  contactStatus.kind === 'error'
                    ? 'text-red-700'
                    : contactStatus.kind === 'success'
                      ? 'text-emerald-800'
                      : 'text-stone-500'
                }`}
              >
                {contactStatus.message || 'Your message will be sent directly to Johnny.'}
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  const [currentPath, setCurrentPath] = useState(getNormalizedPathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(getNormalizedPathname());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPath === '/contact') {
    return <ContactPage />;
  }

  return <ProjectStoryPage />;
}
