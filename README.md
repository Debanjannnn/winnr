# Winnr
![Uploading image.png…]()


An autonomous agent network that researches, debates, and executes prediction market positions — all under a single permission you sign, and can revoke instantly.

Five specialized agents handle every step of the workflow: Scout finds the mispricing, Evidence buys the signal, Research debates the odds on Venice AI, Risk sizes the position, and Execution fires through the 1Shot relayer. Every move is logged to an immutable event trail. You watch it happen. You can stop it anytime.

---

## How it works

```
You sign one ERC-7710 permission
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    Agent Network                        │
  │                                                         │
  │  Scout ──► Evidence ──► Research ──► Risk ──► Execution │
  │    │           │            │          │          │      │
  │  Finds      Pays x402    Debates    Sizes      Fires    │
  │  edge       for signal   on Venice  position   1Shot    │
  └─────────────────────────────────────────────────────────┘
        │
        ▼
  On-chain tx · bounded by the permission you signed
        │
        ▼
  Full audit trail · every event, payment, decision, execution
```

![Uploading image.png…]()

**Scout** scans Polymarket for markets where the crowd price and the statistical model diverge above a threshold — a signal worth investigating.

**Evidence** pays a $0.10 x402 micro-fee to pull a verified intelligence signal from an external paid data provider. The payment receipt goes on-chain.

**Research** runs a multi-round bull/bear debate on Venice AI. Two agents argue opposite sides of the market, then converge on a consensus probability and a disagreement score.

**Risk** scores the opportunity across three dimensions — edge, signal quality, and liquidity — and either approves the position or kills it. Nothing executes without passing this gate.

**Execution** submits a delegated EIP-7710 transaction through the 1Shot permissionless relayer. The transaction is bounded by the exact permission you signed at the start: max trade size, market whitelist, expiry, and spend cap all enforced on-chain.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 6 |
| UI | React 19 · Framer Motion · Tailwind CSS |
| Wallet | MetaMask Smart Accounts Kit · ERC-7710 permissions |
| Chain | Base Sepolia |
| Markets | Polymarket Gamma API · Polymarket CLOB API |
| Intelligence | Venice AI (Mistral 31B) |
| Evidence | x402 HTTP payment protocol |
| Execution | 1Shot permissionless relayer |
| Database | Neon (serverless Postgres) · Drizzle ORM |
| Validation | Zod |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── workflow/page.tsx                 # /workflow route
│   ├── globals.css
│   └── api/
│       ├── health/route.ts
│       ├── sessions/route.ts             # POST — start agent run
│       ├── sessions/[id]/route.ts        # GET — session state
│       ├── sessions/[id]/events/route.ts # GET — event trail
│       ├── sessions/[id]/audit/route.ts  # GET — audit summary
│       ├── workflow-markets/route.ts     # GET — Polymarket feed
│       └── evidence/polymarket-signal/   # x402 evidence seller
├── components/
│   ├── Landing/                          # Landing page sections
│   └── Workflow/                         # Dashboard, cards, agent console
└── lib/
    ├── runtime.ts                        # Global runtime singleton
    ├── domain/                           # Types, schemas, permissions
    ├── agents/                           # CoordinatorAgent + 8 agent roles
    ├── orchestration/                    # Event store, session store, persistence
    ├── risk/                             # Scoring engine + approval logic
    └── adapters/                         # Polymarket, Venice, x402, 1Shot, MetaMask
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
# Venice AI (debate + audit narration)
VENICE_API_KEY=your_venice_api_key
VENICE_MODEL=zai-org-glm-5-1
VENICE_API_BASE_URL=https://api.venice.ai/api/v1

# x402 evidence provider
X402_EVIDENCE_URL=http://localhost:8787/evidence/polymarket-signal
X402_PAYMENT_HEADER=...x402_payment_payload...
X402_PROVIDER_ADDRESS=0x...
X402_NETWORK=base-sepolia

# 1Shot relayer
ONESHOT_RELAYER_URL=https://your-relayer-url
ONESHOT_DELEGATED_TX_PAYLOAD='{"chainId":84532,"authorizationList":[],"calls":[]}'
ONESHOT_SEND_METHOD=relayer_send7710Transaction
ONESHOT_STATUS_METHOD=relayer_getStatus

# Polymarket (optional — defaults to public Gamma API)
POLYMARKET_GAMMA_URL=https://gamma-api.polymarket.com

# Database (Neon serverless Postgres)
DATABASE_URL=postgresql://...
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
npm run build       # Production build
npm run start       # Serve the production build
npm run typecheck   # Type check without emitting
npm run test        # Run tests via tsx
```

---

## Wallet setup

The **Grant MetaMask permission** button issues an ERC-7710 Advanced Permission via MetaMask Smart Accounts Kit. This creates a bounded permission scope that limits every downstream agent action:

- Which markets the agents can trade
- Maximum spend per trade (default $2 USDC)
- Total session budget (default $10 USDC)
- Maximum evidence purchase per call ($0.25 USDC)
- Session expiry (30 minutes)

You need **MetaMask Flask** with Advanced Permissions support enabled. The frontend generates a browser session key as the permission recipient — replace this with your production session-account strategy before going live.

---

## Permission model

Every agent action traces back to a single root permission. The coordinator agent creates two sub-delegations at session start:

1. **Evidence path** — allows the evidence agent to spend up to $0.25 on x402 payments
2. **Execution path** — allows the execution agent to submit a delegated transaction up to the risk-approved amount

Neither sub-agent can exceed the bounds of the root permission. The risk agent acts as the final gate — if it rejects, the execution agent never runs.

```
Root permission (signed by you)
  ├── Evidence sub-delegation ($0.25 cap)
  └── Execution sub-delegation (risk-approved amount, ≤ $2 cap)
```

---

## API reference

All endpoints are same-origin under `/api`. Set `NEXT_PUBLIC_API_BASE_URL` to point the frontend at a different origin.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/workflow-markets` | Paginated Polymarket feed |
| `POST` | `/api/sessions` | Start a new agent run |
| `GET` | `/api/sessions/:id` | Fetch session state and result |
| `GET` | `/api/sessions/:id/events` | Full event trail for a session |
| `GET` | `/api/sessions/:id/audit` | Audit summary with narrative |
| `GET` | `/api/evidence/polymarket-signal` | x402 evidence seller endpoint |

### Start a session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{
    "objective": "Evaluate whether Brazil is mispriced in the World Cup Winner market",
    "marketId": "world-cup-2026-winner",
    "permissionGrant": {
      "mode": "metamask",
      "accountAddress": "0x...",
      "sessionAddress": "0x...",
      "chainId": 84532,
      "grantedPermissions": [{ "type": "erc20-periodic" }],
      "requestedAt": "2026-06-15T00:00:00.000Z"
    }
  }'
```

### Fetch the event trail

```bash
curl http://localhost:3000/api/sessions/<session-id>/events
```

### Fetch the audit

```bash
curl http://localhost:3000/api/sessions/<session-id>/audit
```

---

## Risk scoring

The risk engine evaluates three factors before approving any position:

```
edge           = modelProbability − marketProbability
liquidityScore = min(1, liquidityUsd / 5000)
signalScore    = edge × 0.35
               + qualityScore × 0.25
               + liquidityScore × 0.15
               + recencyScore × 0.10
               + (1 − disagreement) × 0.15
```

**Approval requires all three:**
- `edge ≥ 0.08` — at least an 8% mispricing detected
- `signalScore ≥ 0.45` — evidence and debate confirm the thesis
- `liquidityUsd ≥ 500` — enough depth to absorb the position

If any gate fails, the run is rejected and no transaction is submitted.

---

## Event types

Every session produces a chronological event log. Key event types:

| Event | Triggered by |
|-------|-------------|
| `session.created` | Session start |
| `permission.granted` | MetaMask grant confirmed |
| `permission.redelegation.created` | Sub-delegations issued |
| `market.candidate.detected` | Scout finds a mispriced market |
| `x402.payment.required` | Evidence provider returns 402 |
| `x402.payment.completed` | Micro-payment confirmed on-chain |
| `evidence.received` | Signal data delivered |
| `debate.completed` | Venice AI bull/bear consensus reached |
| `risk.decision.issued` | Risk gate decision (approved / rejected) |
| `execution.submitted` | 1Shot relayer call sent |
| `execution.confirmed` | Transaction confirmed on Base Sepolia |
| `audit.created` | Narrator summary written |
| `workflow.failed` | Any unrecoverable agent error |

---

## License

MIT
# winnr
