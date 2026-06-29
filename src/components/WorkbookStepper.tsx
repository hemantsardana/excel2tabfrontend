import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import type { WorkbookStatus } from "@/types";

/** join truthy class names */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {children}
    </svg>
  );
}

type Step = {
  slug: string;
  /** Route to navigate to for this step. `:id` is replaced with the workbook id. */
  to: string;
  label: string;
  description: string;
  icon: ReactNode;
};

/**
 * The conversion workflow, presented as the SAS-to-Falcon-style 5-stage wizard:
 *   Upload → Extract → Process → Convert → Generated Assets
 * mapped onto the existing Excel2Tableau screens (routing unchanged).
 */
const STEPS: Step[] = [
  {
    slug: "upload",
    to: "/upload",
    label: "Upload",
    description: "Upload Excel file",
    icon: <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Svg>,
  },
  {
    slug: "analysis",
    to: "/workbook/:id/analysis",
    label: "Extract",
    description: "Parse workbook",
    icon: <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>,
  },
  {
    slug: "mapping",
    to: "/workbook/:id/mapping",
    label: "Process",
    description: "AI analysis & mapping",
    icon: <Svg><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></Svg>,
  },
  {
    slug: "assets",
    to: "/workbook/:id/assets",
    label: "Generated Assets",
    description: "Generate & download",
    icon: <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Svg>,
  },
  {
    slug: "validation",
    to: "/workbook/:id/validation",
    label: "Validate",
    description: "Quality checks",
    icon: <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></Svg>,
  },
];

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/** Which steps are "done" given the workbook's backend status. */
function isStepComplete(slug: string, status?: WorkbookStatus): boolean {
  if (!status) return false;
  const analyzed = ["analyzed", "generating", "generated", "published"].includes(status);
  const generated = ["generated", "published"].includes(status);
  switch (slug) {
    // The workbook only exists once it has been uploaded, so Upload is always done here.
    case "upload":
      return true;
    case "analysis":
      return analyzed;
    case "mapping":
    case "assets":
    case "validation":
      return generated;
    default:
      return false;
  }
}

/**
 * SAS-to-Falcon-style horizontal workflow stepper for the per-workbook
 * conversion flow. All steps remain navigable (free tab navigation is
 * unchanged); the stepper purely restyles the tab bar and reflects progress
 * derived from the workbook status. Uses the EXL brand palette.
 */
export default function WorkbookStepper({
  workbookId,
  status,
}: {
  workbookId: number;
  status?: WorkbookStatus;
}) {
  const href = (step: Step) => step.to.replace(":id", String(workbookId));

  return (
    <nav className="mt-5 animate-fade-in-down" data-testid="workbook-stepper">
      {/* Desktop */}
      <div className="hidden items-center md:flex">
        {STEPS.map((step, index) => {
          const completed = isStepComplete(step.slug, status);
          const connectorDone = isStepComplete(STEPS[index].slug, status);
          return (
            <div key={step.slug} className="flex items-center">
              <NavLink
                to={href(step)}
                end
                data-testid={`step-${step.slug}`}
                className={({ isActive }) =>
                  cx(
                    "group relative flex items-center gap-3 rounded-2xl px-5 py-3 transition-all duration-300",
                    isActive
                      ? "scale-[1.03] bg-brand-gradient text-white shadow-brand"
                      : completed
                        ? "bg-brand-50 text-brand-700 hover:scale-[1.02] hover:bg-brand-100"
                        : "bg-ink-50 text-ink-500 hover:scale-[1.02] hover:bg-ink-100",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Soft glow behind the active step */}
                    {isActive && (
                      <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-brand-gradient opacity-40 blur-xl" />
                    )}
                    <span
                      className={cx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isActive
                          ? "bg-white/20 text-white"
                          : completed
                            ? "bg-brand-500/15 text-brand-600"
                            : "bg-white text-ink-300 shadow-card",
                      )}
                    >
                      {completed && !isActive ? CheckIcon : step.icon}
                    </span>
                    <span className="text-left">
                      <span
                        className={cx(
                          "block text-sm font-semibold leading-tight",
                          isActive ? "text-white" : completed ? "text-brand-700" : "text-ink-700",
                        )}
                      >
                        {step.label}
                      </span>
                      <span
                        className={cx(
                          "mt-0.5 block text-[11px] leading-tight",
                          isActive ? "text-white/75" : "text-ink-500",
                        )}
                      >
                        {step.description}
                      </span>
                    </span>
                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-brand" />
                    )}
                  </>
                )}
              </NavLink>

              {index < STEPS.length - 1 && (
                <div className="relative mx-1.5 flex h-[2px] w-8 items-center justify-center rounded-full bg-ink-100">
                  <div
                    className={cx(
                      "h-full rounded-full bg-brand-400 transition-all duration-500",
                      connectorDone ? "w-full" : "w-0",
                    )}
                  />
                  {connectorDone && (
                    <span className="absolute text-brand-500/70">{ChevronIcon}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between gap-1.5 md:hidden">
        {STEPS.map((step, index) => {
          const completed = isStepComplete(step.slug, status);
          return (
            <div key={step.slug} className="flex flex-1 items-center">
              <NavLink
                to={href(step)}
                end
                data-testid={`step-mobile-${step.slug}`}
                className={({ isActive }) =>
                  cx(
                    "flex w-full flex-col items-center gap-1 rounded-xl py-2 transition-all",
                    isActive
                      ? "bg-brand-gradient text-white shadow-brand"
                      : completed
                        ? "text-brand-600"
                        : "text-ink-500",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cx(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        isActive ? "bg-white/20" : completed ? "bg-brand-500/10" : "bg-ink-50",
                      )}
                    >
                      {completed && !isActive ? CheckIcon : step.icon}
                    </span>
                    <span className="text-[10px] font-medium leading-none">{step.label}</span>
                  </>
                )}
              </NavLink>
              {index < STEPS.length - 1 && (
                <div
                  className={cx(
                    "h-0.5 w-3 shrink-0 rounded-full",
                    completed ? "bg-brand-400" : "bg-ink-100",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
