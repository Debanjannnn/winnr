import type { Feature, NavLink, Partner, Stat, UseCase } from "./types";

export const navLinks: NavLink[] = [
  { href: "#home", label: "Home" },
  { href: "#platform", label: "Platform" },
  { href: "#use-cases", label: "Use Case" },
  { href: "#labs", label: "Labs" }
];

export const partners: Partner[] = [
  { name: "MetaMask", logo: "/logos/metamask.svg" },
  { name: "Polymarket", logo: "/logos/polymarket.svg" },
  { name: "x402", logo: "/logos/x402.svg" },
  { name: "Venice AI", logo: "/logos/venice.svg" },
  { name: "1Shot", logo: "/logos/oneshot.svg" },
  { name: "EIP-7710", logo: "/logos/eip7710.svg" },
  { name: "Ethereum", logo: "/logos/ethereum.svg" }
];

export const stats: Stat[] = [
  { value: "$0", label: "Spendable off the signed budget" },
  { value: "100%", label: "Of moves written to the trail" },
  { value: "1 tap", label: "Revokes every agent at once" }
];

export const features: Feature[] = [
  { index: "01", title: "Stay in control", text: "Agents act only under a permission you sign." },
  { index: "02", title: "Pay their own way", text: "Agents pay x402 fees for the data they need." },
  { index: "03", title: "No blind bets", text: "No trade clears without passing the risk gate." }
];

export const useCases: UseCase[] = [
  {
    title: "Mispricing Scout",
    description:
      "Finds the markets where the crowd and the evidence disagree, then flags the gap worth acting on before anyone else moves."
  },
  {
    title: "Evidence Buyer",
    description:
      "Pays x402 micro-fees to pull the exact signal a call depends on, then hands the receipt and the data down the chain."
  },
  {
    title: "Probability Court",
    description:
      "Debates the true odds on Venice AI before a single dollar moves, records the verdict, and forwards it to the risk agent."
  },
  {
    title: "Risk Underwriter",
    description:
      "Sizes the bet against your live budget or walks away. No position ever outgrows the permission you signed at the start."
  },
  {
    title: "On-Chain Executor",
    description:
      "Fires risk-approved trades through the 1Shot permissionless relayer, bounded at every step by the grant you signed."
  },
  {
    title: "Compliance Narrator",
    description:
      "Turns the full event stream into a plain-English story you can audit line by line, from permission to confirmed trade."
  }
];

export const labChecks: string[] = [
  "Permission granted",
  "Paywall paid (402 → 200)",
  "Odds debated on Venice",
  "Relayer tx confirmed"
];
