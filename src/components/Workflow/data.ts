export interface Category {
  label: string;
  slug: string;
}

// Maps to Polymarket Gamma `tag_slug` values. "All" clears the filter.
export const CATEGORIES: Category[] = [
  { label: "All", slug: "" },
  { label: "Sports", slug: "sports" },
  { label: "Crypto", slug: "crypto" },
  { label: "Politics", slug: "politics" },
  { label: "Finance", slug: "economy" },
  { label: "Tech", slug: "tech" },
  { label: "World", slug: "world" },
  { label: "Elections", slug: "elections" },
  { label: "Culture", slug: "pop-culture" }
];

export interface SortOption {
  label: string;
  value: string;
}

// Maps to Gamma `order` values.
export const SORT_OPTIONS: SortOption[] = [
  { label: "Trending", value: "volume24hr" },
  { label: "Top volume", value: "volume" },
  { label: "Liquidity", value: "liquidity" },
  { label: "Newest", value: "startDate" }
];
