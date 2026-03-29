export type BookPlanningLink = { href: string; label: string };

/** Passed into the planning cockpit when opened from a book / reader context. */
export type BookPlanningContext = {
  bookSlug: string;
  bookTitle?: string;
  planningLinks?: BookPlanningLink[];
  /** When true, show an EPUB reader tab (iframe → host reader route). */
  embedReader?: boolean;
};

export function bookContextFromModalPayload(
  payload: Record<string, unknown> | undefined,
): BookPlanningContext | undefined {
  if (!payload || typeof payload.bookSlug !== 'string') return undefined;
  const links = payload.planningLinks;
  return {
    bookSlug: payload.bookSlug,
    bookTitle: typeof payload.bookTitle === 'string' ? payload.bookTitle : undefined,
    planningLinks: Array.isArray(links)
      ? (links as BookPlanningLink[]).filter(
          (x): x is BookPlanningLink =>
            !!x &&
            typeof x === 'object' &&
            typeof (x as BookPlanningLink).href === 'string' &&
            typeof (x as BookPlanningLink).label === 'string',
        )
      : undefined,
    embedReader: payload.embedReader === true,
  };
}
