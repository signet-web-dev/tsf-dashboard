function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenOverlapScore(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const matched = queryTokens.filter((t) => candidateSet.has(t)).length;
  return matched / queryTokens.length;
}

export function fuzzyScore(query: string, candidate: string): number {
  const nq = normalize(query);
  const nc = normalize(candidate);
  if (!nq || !nc) return 0;
  if (nc === nq) return 1;
  if (nc.includes(nq) || nq.includes(nc)) return 0.85;

  const overlap = tokenOverlapScore(nq.split(" "), nc.split(" "));
  return overlap * 0.7;
}

export function bestMatches<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  topN = 5
): Array<{ item: T; score: number }> {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getKey(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
