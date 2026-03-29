import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Medilyzer</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 rounded-lg border border-primary text-primary font-medium text-base hover:bg-primary/5 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-base hover:bg-primary/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1>
            <span className="block text-[28px] md:text-[36px] font-normal leading-snug text-foreground/80">Your doctor explains in their language.</span>
            <span className="block text-[28px] md:text-[36px] font-normal leading-snug text-foreground/80 mt-2">Google explains too much.</span>
            <span className="block text-[32px] md:text-[42px] font-bold leading-snug text-primary mt-3">Medilyzer explains it right.</span>
          </h1>
          <p className="mt-8 text-lg text-muted-foreground">
            Stop guessing about your health. Start understanding it.
          </p>
          <Link
            to="/signup"
            className="inline-block mt-10 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            Upload your first report — it's free
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. No medical knowledge needed.
          </p>
          <div className="mt-12 border-t border-border/50" />
        </div>
      </section>

      {/* PROBLEM STRIP */}
      <section className="bg-muted py-16 md:py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Lab reports nobody explains",
              body: "You get a page of numbers after every blood test. Your doctor has 8 minutes. Nobody walks you through what it means.",
            },
            {
              title: "Medications you take but don't understand",
              body: "You have been taking that pill for months. Do you know what it does? What to avoid while taking it? Most people don't.",
            },
            {
              title: "Diet advice that doesn't fit your health",
              body: "Generic meal plans don't know your iron is low or that your B12 has been declining for six months. Medilyzer does.",
            },
          ].map((card) => (
            <div key={card.title} className="bg-card rounded-xl border border-border p-8">
              <h3 className="text-xl font-semibold text-foreground mb-3">{card.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT MEDILYZER DOES */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Everything you need to understand your health. In one place.
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Understand your lab results",
                body: "Upload any lab report as a PDF. Medilyzer reads it automatically and explains every result in plain English — what is normal, what needs attention, and how it has changed over time.",
              },
              {
                title: "Know what your medication does",
                body: "Every medication in your history is explained simply — what it treats, how it works, what to avoid. Written for patients, not doctors.",
              },
              {
                title: "Get a diet plan for your health",
                body: "Based on your actual lab results and medications, Medilyzer tells you exactly what to eat and what to avoid. Not generic advice — advice for your body.",
              },
              {
                title: "Find the right doctor",
                body: "Describe how you are feeling. Medilyzer will tell you which type of specialist to see and show you doctors near you who can help.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-xl border border-border p-8">
                <h3 className="text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-muted py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">How it works</h2>
          <p className="text-lg text-muted-foreground mb-12">Three steps. No complexity.</p>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                num: "1",
                title: "Upload your report",
                body: "Take any lab report or prescription and upload it as a PDF. Medilyzer reads it in seconds.",
              },
              {
                num: "2",
                title: "We explain everything",
                body: "Your results, your medications, and your diet recommendations appear instantly — all in plain English.",
              },
              {
                num: "3",
                title: "Understand your health",
                body: "See your full health picture in one place. Track changes over time. Know what to do next.",
              },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <span className="inline-block text-5xl font-bold text-primary mb-4">{s.num}</span>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Built for people the healthcare system leaves behind
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "If you have a chronic condition",
                body: "Diabetes, PCOS, thyroid issues, heart disease — managing a long term condition means constant lab results and multiple medications. Medilyzer helps you keep track and actually understand what is happening.",
              },
              {
                title: "If you have no regular doctor",
                body: "35 million Americans have no consistent primary care physician. They bounce between urgent care clinics with no continuous record. Medilyzer gives them one.",
              },
              {
                title: "If English is not your first language",
                body: "Medical jargon is hard enough in your own language. Medilyzer explains everything simply and clearly so nothing gets lost in translation.",
              },
            ].map((c) => (
              <div key={c.title} className="bg-card rounded-xl border border-border p-8">
                <h3 className="text-xl font-semibold text-foreground mb-3">{c.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground leading-tight">
            Your health. In plain English.<br />For free.
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/80">
            Upload your first report today and understand your health like never before.
          </p>
          <Link
            to="/signup"
            className="inline-block mt-10 px-8 py-4 rounded-lg bg-primary-foreground text-primary font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Get started — it's free
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-foreground py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          <div>
            <span className="text-xl font-bold text-primary">Medilyzer</span>
            <p className="mt-2 text-sm text-muted">Your health. In plain English.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-3">Product</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted hover:text-primary-foreground transition-colors">Home</Link>
              <Link to="/login" className="text-sm text-muted hover:text-primary-foreground transition-colors">Log in</Link>
              <Link to="/signup" className="text-sm text-muted hover:text-primary-foreground transition-colors">Sign up</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-primary-foreground mb-3">Important</h4>
            <p className="text-sm text-muted leading-relaxed">
              Medilyzer helps you understand your health information. It does not provide medical advice or diagnoses. Always consult your doctor before making any health decisions.
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-muted-foreground/20 text-center">
          <p className="text-sm text-muted">© 2026 Medilyzer. Built for the IU Claude Hackathon.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
