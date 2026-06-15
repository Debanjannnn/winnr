import {
  type DomainEvent,
  type EventTypeValue,
  type Session,
  createId,
  nowIso
} from "../domain/types";

export class EventStore {
  #events: DomainEvent[] = [];

  append<TPayload>(
    sessionId: string,
    type: EventTypeValue,
    payload: TPayload
  ): DomainEvent<TPayload> {
    const event: DomainEvent<TPayload> = {
      id: createId("evt"),
      sessionId,
      type,
      payload,
      createdAt: nowIso()
    };
    this.#events.push(event);
    return event;
  }

  list(sessionId: string): DomainEvent[] {
    return this.#events.filter((event) => event.sessionId === sessionId);
  }
}

export class SessionStore {
  #sessions = new Map<string, Session>();

  create(session: Session): Session {
    this.#sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): Session | null {
    return this.#sessions.get(sessionId) ?? null;
  }

  update(sessionId: string, patch: Partial<Session>): Session {
    const current = this.get(sessionId);
    if (!current) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const next: Session = { ...current, ...patch, updatedAt: nowIso() };
    this.#sessions.set(sessionId, next);
    return next;
  }
}
