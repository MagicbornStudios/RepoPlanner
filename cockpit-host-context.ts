export type PlanningQuickLink = { href: string; label: string };

/**
 * Optional host-supplied context when the planning cockpit is opened next to a
 * reading surface (EPUB reader, doc viewer, etc.). Repo-planner stays agnostic:
 * `readingTargetId` is opaque — the host maps it to routes and query params.
 */
export type CockpitHostContext = {
  readingTargetId: string;
  surfaceLabel?: string;
  quickLinks?: PlanningQuickLink[];
};

function normalizeQuickLinks(raw: unknown): PlanningQuickLink[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (x): x is PlanningQuickLink =>
      !!x &&
      typeof x === "object" &&
      typeof (x as PlanningQuickLink).href === "string" &&
      typeof (x as PlanningQuickLink).label === "string",
  );
}

/**
 * Parse modal / strip payload into `CockpitHostContext`.
 * Accepts neutral keys (`readingTargetId`, `surfaceLabel`, `quickLinks`)
 * and legacy keys (`bookSlug`, `bookTitle`, `planningLinks`) from older hosts.
 */
export function cockpitHostContextFromPayload(
  payload: Record<string, unknown> | undefined,
): CockpitHostContext | undefined {
  if (!payload) return undefined;

  const readingTargetId =
    typeof payload.readingTargetId === "string"
      ? payload.readingTargetId
      : typeof payload.bookSlug === "string"
        ? payload.bookSlug
        : undefined;
  if (!readingTargetId) return undefined;

  const linksRaw = payload.quickLinks ?? payload.planningLinks;
  const surfaceLabel =
    typeof payload.surfaceLabel === "string"
      ? payload.surfaceLabel
      : typeof payload.bookTitle === "string"
        ? payload.bookTitle
        : undefined;

  return {
    readingTargetId,
    surfaceLabel,
    quickLinks: normalizeQuickLinks(linksRaw),
  };
}
