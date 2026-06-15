export type Team = {
  code?: string;
  name: string;
  percent: string;
  asset: string;
};

export type QuestionOption = {
  label: string;
  percent: string;
};

// Optional fields used by the detail view (MarketDetail). MarketCard ignores them.
type Detail = {
  slug?: string;
  clobTokenId?: string;
  closed?: boolean;
  breakdown?: QuestionOption[];
};

export type Card =
  | ({
      type: "question";
      title: string;
      image: string;
      imageUrl?: string;
      options: QuestionOption[];
      volume: string;
    } & Detail)
  | {
      type: "teams";
      teams: Team[];
      buttons: string[];
      volume: string;
      league: string;
      live?: boolean;
    }
  | ({
      type: "binary";
      title: string;
      image: string;
      imageUrl?: string;
      chance: string;
      volume: string;
    } & Detail);
