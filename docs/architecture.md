# Backend Architecture

## System Overview

```txt
Client
  -> API
  -> Coordinator Agent
  -> Scout Agent
  -> Evidence Agent
  -> Research Agent
  -> Risk Agent
  -> Execution Agent
  -> Monitoring Agent
  -> Narrator Agent

Adapters:
  MetaMask permissions
  x402 evidence payments
  Venice reasoning
  1Shot relayer

State:
  In-memory demo store now
  Postgres + event stream in production
```

## Production Boundaries

- `domain`: canonical value objects and validation.
- `agents`: deterministic agent responsibilities and handoffs.
- `adapters`: sponsor/API integrations with mockable interfaces.
- `risk`: risk and position sizing policy.
- `orchestration`: workflow coordination, event log, state transitions.
- `apps/api`: HTTP surface for the future frontend.

## Demo Rule

The hackathon demo should make four events visually obvious:

1. Permission granted.
2. x402 payment required and paid.
3. Venice debate completed.
4. 1Shot relayer transaction confirmed.
