type SearchableRevision = {
  title: string;
  bodyJson: string;
  tags: string;
  product: string;
  apiVersion: string;
  language: string;
  contentType: string;
};

const pageSize = 20;

export function filterSearchCandidates<T extends { revision: SearchableRevision }>(input: {
  candidates: T[];
  query: string;
  page: number;
  canAccess: (candidate: T) => boolean;
}) {
  const query = input.query.trim().toLocaleLowerCase();
  const matched = input.candidates.filter((candidate) => {
    if (!input.canAccess(candidate)) return false;
    if (!query) return true;

    const revision = candidate.revision;
    const searchable = [
      revision.title,
      revision.bodyJson,
      revision.tags,
      revision.product,
      revision.apiVersion,
      revision.language,
      revision.contentType,
    ].join("\n").toLocaleLowerCase();
    return searchable.includes(query);
  });
  const start = (input.page - 1) * pageSize;

  return {
    candidates: matched.slice(start, start + pageSize),
    pageSize,
    total: matched.length,
  };
}
