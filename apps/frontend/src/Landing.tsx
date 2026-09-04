import { Link } from "react-router-dom";
import { Mic, Sparkles, GitBranch, BarChart3, ArrowRight } from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "GitHub-aware questions",
    body: "We read your public repos and tailor the interview to what you actually build.",
  },
  {
    icon: Mic,
    title: "Live voice interview",
    body: "Talk to an AI interviewer in real time — no chat walls, just a focused session.",
  },
  {
    icon: BarChart3,
    title: "Score and feedback",
    body: "Get a score, status, strengths, and what to improve after you hang up.",
  },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0a09] text-stone-100">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-16 top-40 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl landing-blob" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl landing-blob-slow" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Intervona</span>
        </div>
        <Link
          to="/form"
          className="rounded-full border border-stone-700 bg-stone-900/80 px-4 py-2 text-sm text-stone-200 transition hover:border-amber-500/50 hover:text-amber-300"
        >
          Start interview
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-10">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-500/80">
              Voice AI interviewer
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Practice technical interviews
              <span className="block text-amber-400">with your GitHub as context.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-400">
              Drop in a GitHub profile, talk to a live AI interviewer, then see score, status,
              efficiency, and a clear summary of how you did.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/form"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
              >
                Begin now <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center rounded-xl border border-stone-700 px-5 py-3 text-sm text-stone-300 transition hover:border-stone-500"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="relative flex h-[380px] items-center justify-center">
            <div className="absolute h-56 w-56 rounded-full bg-amber-500/15 blur-2xl animate-pulse" />
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-amber-400/40 bg-stone-900/70 shadow-[0_0_80px_rgba(251,191,36,0.25)]">
              <div className="flex items-end gap-1.5">
                {[16, 28, 40, 28, 16].map((h, i) => (
                  <span
                    key={i}
                    className="w-2 rounded-full bg-amber-300 landing-bar"
                    style={{ height: h, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute bottom-10 rounded-full border border-stone-700 bg-stone-900/90 px-4 py-2 text-xs text-stone-400">
              Live voice session
            </div>
          </div>
        </div>

        <section id="how" className="mt-24 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6 transition hover:border-amber-500/30"
            >
              <feature.icon className="h-5 w-5 text-amber-400" />
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
