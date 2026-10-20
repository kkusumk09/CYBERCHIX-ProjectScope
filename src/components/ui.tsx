import { cn } from "@/lib/utils";

/* ===========================================================================
   NEO BRUTALIST COMPONENT SYSTEM
   ---------------------------------------------------------------------------
   Everything is hard-edged: 3px ink borders, 4px offset shadows, flat loud
   colour blocks, and uppercase display type. Buttons physically press into
   the page.
   =========================================================================== */

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

export type ButtonTone = "ink" | "acid" | "punch" | "sky" | "mint" | "paper";

const TONES: Record<ButtonTone, string> = {
  ink: "bg-ink text-paper-2 hover:bg-ink-soft",
  acid: "bg-acid text-ink hover:brightness-95",
  punch: "bg-punch text-ink hover:brightness-95",
  sky: "bg-sky text-ink hover:brightness-95",
  mint: "bg-mint text-ink hover:brightness-95",
  paper: "bg-paper-2 text-ink hover:bg-paper",
};

export function buttonClass(tone: ButtonTone = "ink", className?: string) {
  return cn("brutal-btn", TONES[tone], className);
}

export function Button({
  tone = "ink",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return <button type={type} className={buttonClass(tone, className)} {...props} />;
}

/** A link that looks like a button. */
export function ButtonLink({
  tone = "ink",
  className,
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: ButtonTone;
  href: string;
}) {
  return (
    <a href={href} className={buttonClass(tone, className)} {...props}>
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  flat = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { flat?: boolean }) {
  return (
    <div
      className={cn(flat ? "brutal-card-flat" : "brutal-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-[3px] flex flex-wrap items-start justify-between gap-3 border-b-[3px] border-ink bg-ink px-5 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="brutal-label text-paper-2">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-medium text-paper-2/80">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/* -------------------------------------------------------------------------- */
/* Tag / tag                                                                 */
/* -------------------------------------------------------------------------- */

export type TagTone = "paper" | "acid" | "punch" | "sky" | "mint" | "tangerine" | "violet" | "ink";

const TAG_TONES: Record<TagTone, string> = {
  paper: "bg-paper-2 text-ink",
  acid: "bg-acid text-ink",
  punch: "bg-punch text-ink",
  sky: "bg-sky text-ink",
  mint: "bg-mint text-ink",
  tangerine: "bg-tangerine text-ink",
  violet: "bg-violet text-ink",
  ink: "bg-ink text-paper-2",
};

export function Tag({
  tone = "paper",
  className,
  children,
  title,
}: {
  tone?: TagTone;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span title={title} className={cn("brutal-tag", TAG_TONES[tone], className)}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                       */
/* -------------------------------------------------------------------------- */

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-sky text-ink",
    good: "bg-mint text-ink",
    warn: "bg-acid text-ink",
    bad: "bg-punch text-ink",
  } as const;

  return (
    <div className={cn("border-[3px] border-ink px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="brutal-label">{title}</p> : null}
      {children ? (
        <div className={cn(Boolean(title) && "mt-1.5")}>{children}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="brutal-label block text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs font-medium text-ink/60">{hint}</p> : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("brutal-input", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn("brutal-input min-h-24 resize-y", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("brutal-input brutal-select", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border-[3px] border-ink bg-paper-2 p-3 transition-transform hover:-translate-y-0.5",
        props.checked && "bg-acid",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 appearance-none border-[3px] border-ink bg-paper-2 checked:bg-ink"
        {...props}
      />
      <span className="min-w-0">
        <span className="brutal-label block text-ink">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs font-medium text-ink/70">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin border-[3px] border-current border-r-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-4 w-full border-[3px] border-ink bg-paper-2", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-acid transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "■",
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border-[3px] border-dashed border-ink bg-paper-2 px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center border-[3px] border-ink bg-ink text-xl text-acid">
        {icon}
      </div>
      <h3 className="brutal-display text-xl text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-ink/70">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "paper",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: TagTone;
}) {
  return (
    <div className="border-[3px] border-ink bg-paper-2 shadow-[4px_4px_0_0_#0a0a0a]">
      <div className={cn("border-[3px] border-b-[3px] border-ink px-4 py-1.5", TAG_TONES[tone])}>
        <p className="brutal-label">{label}</p>
      </div>
      <div className="px-4 py-3">
        <p className="brutal-display text-3xl text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs font-medium text-ink/60">{hint}</p> : null}
      </div>
    </div>
  );
}

/** A hard-edged section heading with a rule under it. */
export function SectionTitle({
  children,
  kicker,
  className,
}: {
  children: React.ReactNode;
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      {kicker ? <p className="brutal-label text-punch">{kicker}</p> : null}
      <h2 className="brutal-display text-2xl text-ink">{children}</h2>
      <div className="mt-2 h-[3px] w-full bg-ink" />
    </div>
  );
}
