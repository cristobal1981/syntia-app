import { describe, expect, it, vi } from "vitest";

import {
  EVENT_BATCH_SIZE,
  EVENT_MAX_AGE_MS,
  EVENT_QUIET_MS,
  runEventPushDispatch,
  type EventPushDispatchDeps,
} from "@/src/modules/push/application/run-event-push-dispatch";
import { MAX_CONSECUTIVE_REJECTIONS } from "@/src/modules/push/application/run-push-dispatch";
import type { PortalEventRow } from "@/src/modules/push/domain/portal-event";
import type {
  DispatchSubscription,
  PushRecipient,
} from "@/src/modules/push/infrastructure/push-subscriptions.supabase";

const NOW = Date.parse("2026-10-22T12:00:00Z");

function event(partial: Partial<PortalEventRow> = {}): PortalEventRow {
  return {
    seq: 6,
    eventId: "msg:1",
    partnerId: 12,
    kind: "message",
    scope: "tramite",
    recordId: 99,
    recordName: "IRPF",
    stateLabel: null,
    previousStateLabel: null,
    messageId: 10,
    excerpt: "Hola, sube el modelo 303",
    byClient: false,
    occurredAt: new Date(NOW - 120_000).toISOString(),
    receivedAt: new Date(NOW - 60_000).toISOString(),
    ...partial,
  };
}

function sub(
  partial: Partial<DispatchSubscription> = {},
): DispatchSubscription {
  return {
    id: "s1",
    userId: "u1",
    endpoint: "https://push.example/1",
    p256dh: "k",
    auth: "a",
    preferences: { chatter: true, status: true, firmas: true },
    sentKeys: [],
    baselined: true,
    failureCount: 0,
    lastEventSeq: 5,
    ...partial,
  };
}

function recipient(partial: Partial<PushRecipient> = {}): PushRecipient {
  return {
    id: "u1",
    email: "a@b.c",
    role: "client",
    authUserId: "auth-1",
    status: "active",
    isActive: true,
    ...partial,
  };
}

function setup(
  overrides: Partial<EventPushDispatchDeps> = {},
  subs: DispatchSubscription[] = [sub()],
  events: PortalEventRow[] = [event()],
  recipients: PushRecipient[] = [recipient()],
) {
  const deps: EventPushDispatchDeps = {
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(undefined),
    listSubscriptions: vi.fn().mockResolvedValue(subs),
    fetchRecipients: vi
      .fn()
      .mockResolvedValue(new Map(recipients.map((entry) => [entry.id, entry]))),
    fetchPartnerIds: vi.fn().mockResolvedValue(new Map([["u1", 12]])),
    getMaxEventSeq: vi.fn().mockResolvedValue(50),
    listMatureEvents: vi.fn().mockResolvedValue(events),
    loadAllowedSections: vi.fn().mockResolvedValue(new Set(["/tramites"])),
    fetchReadState: vi.fn().mockResolvedValue(new Map()),
    send: vi.fn().mockResolvedValue("ok"),
    saveFailureCount: vi.fn().mockResolvedValue(undefined),
    advanceCursors: vi.fn().mockResolvedValue(undefined),
    deleteByIds: vi.fn().mockResolvedValue(undefined),
    now: () => NOW,
    order: (items) => items,
    ...overrides,
  };
  return deps;
}

const options = { deadlineAt: NOW + 45_000 };

describe("runEventPushDispatch: envío", () => {
  it("manda el evento nuevo con su extracto y avanza el cursor al último evento", async () => {
    const deps = setup();
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1" }),
      expect.objectContaining({ body: "Hola, sube el modelo 303" }),
    );
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
    expect(summary).toMatchObject({
      users: 1,
      sent: 1,
      skipped: 0,
      removed: 0,
      locked: false,
    });
  });

  it("espera a que el evento lleve un rato guardado para agrupar los seguidos", async () => {
    const deps = setup();
    await runEventPushDispatch(deps, options);

    expect(deps.listMatureEvents).toHaveBeenCalledWith(
      5,
      new Date(NOW - EVENT_QUIET_MS),
      EVENT_BATCH_SIZE,
    );
    expect(EVENT_QUIET_MS).toBe(30_000);
  });

  it("lee desde el cursor más bajo de todos los dispositivos", async () => {
    const deps = setup({}, [
      sub({ id: "s1", lastEventSeq: 9 }),
      sub({ id: "s2", lastEventSeq: 3 }),
    ]);
    await runEventPushDispatch(deps, options);

    expect(deps.listMatureEvents).toHaveBeenCalledWith(
      3,
      expect.any(Date),
      EVENT_BATCH_SIZE,
    );
  });

  it("varios mensajes del mismo trámite son un solo push, con el último extracto", async () => {
    const deps = setup(
      {},
      [sub()],
      [
        event({ seq: 6, messageId: 10, excerpt: "primero" }),
        event({ seq: 7, eventId: "msg:2", messageId: 11, excerpt: "segundo" }),
      ],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: "segundo" }),
    );
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 7);
  });

  it("varios registros distintos se resumen en un solo push que lleva al inicio", async () => {
    const deps = setup(
      {},
      [sub()],
      [
        event({ seq: 6, recordId: 1 }),
        event({ seq: 7, eventId: "e2", recordId: 2, messageId: 11 }),
      ],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ url: "/dashboard", tag: "syntia-summary" }),
    );
  });

  it("un cambio de estado dice el estado nuevo", async () => {
    const deps = setup(
      {},
      [sub()],
      [
        event({
          kind: "status",
          messageId: null,
          excerpt: null,
          stateLabel: "Hecho",
          previousStateLabel: "En curso",
        }),
      ],
    );
    await runEventPushDispatch(deps, options);

    const payload = vi.mocked(deps.send).mock.calls[0]![1];
    expect(payload.title).toContain("IRPF");
    expect(payload.title).toContain("Hecho");
  });
});

describe("runEventPushDispatch: a quién no se avisa (y el cursor avanza igual)", () => {
  it("eventos de otro cliente", async () => {
    const deps = setup({}, [sub()], [event({ partnerId: 999 })]);
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
    expect(summary.sent).toBe(0);
  });

  it("cambios hechos por el propio cliente", async () => {
    const deps = setup({}, [sub()], [event({ byClient: true })]);
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it("eventos que ya caducaron (más de una hora)", async () => {
    const deps = setup(
      {},
      [sub()],
      [
        event({
          receivedAt: new Date(NOW - EVENT_MAX_AGE_MS - 1).toISOString(),
        }),
      ],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it("un evento de hace 61 minutos ya no se manda (el valor es de una hora)", async () => {
    const deps = setup(
      {},
      [sub()],
      [event({ receivedAt: new Date(NOW - 61 * 60_000).toISOString() })],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(EVENT_MAX_AGE_MS).toBe(3_600_000);
  });

  it("un evento justo en el límite de una hora todavía se manda", async () => {
    const deps = setup(
      {},
      [sub()],
      [event({ receivedAt: new Date(NOW - EVENT_MAX_AGE_MS).toISOString() })],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("eventos que el dispositivo ya había procesado", async () => {
    const deps = setup({}, [sub({ lastEventSeq: 6 })], [event({ seq: 6 })]);
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
  });

  it("cada dispositivo recibe solo lo posterior a su cursor, el del mismo evento no", async () => {
    const deps = setup(
      {},
      [
        sub({ id: "behind", lastEventSeq: 3 }),
        sub({ id: "ahead", lastEventSeq: 4 }),
      ],
      [
        event({
          seq: 4,
          eventId: "e4",
          recordId: 1,
          recordName: "Antiguo",
          messageId: 40,
        }),
        event({
          seq: 8,
          eventId: "e8",
          recordId: 2,
          recordName: "Nuevo",
          messageId: 80,
        }),
      ],
    );
    await runEventPushDispatch(deps, options);

    const byId = new Map(
      vi
        .mocked(deps.send)
        .mock.calls.map(([subscription, payload]) => [
          subscription.id,
          payload,
        ]),
    );
    expect(byId.get("behind")?.tag).toBe("syntia-summary");
    expect(byId.get("ahead")?.title).toContain("Nuevo");
    expect(byId.get("ahead")?.title).not.toContain("Antiguo");
  });

  it("un dispositivo ya por delante del último evento no se toca", async () => {
    const deps = setup({}, [sub({ lastEventSeq: 20 })], [event({ seq: 6 })]);
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
    expect(summary.users).toBe(0);
  });

  it("un tipo de aviso que ese dispositivo tiene apagado", async () => {
    const deps = setup(
      {},
      [sub({ preferences: { chatter: false, status: true, firmas: true } })],
      [event()],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it("un usuario sin cliente de Odoo vinculado", async () => {
    const deps = setup({
      fetchPartnerIds: vi.fn().mockResolvedValue(new Map()),
    });
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it.each([
    ["usuario inexistente", undefined],
    ["archivado", recipient({ status: "Archived" })],
    ["desactivado", recipient({ isActive: false })],
    ["rol de asesor", recipient({ role: "advisor" })],
  ])(
    "borra las suscripciones de un %s sin mandarle nada",
    async (_name, rec) => {
      const deps = setup({
        fetchRecipients: vi
          .fn()
          .mockResolvedValue(rec ? new Map([["u1", rec]]) : new Map()),
      });
      const summary = await runEventPushDispatch(deps, options);

      expect(deps.send).not.toHaveBeenCalled();
      expect(deps.deleteByIds).toHaveBeenCalledWith(["s1"]);
      expect(summary.removed).toBe(1);
      expect(deps.listMatureEvents).not.toHaveBeenCalled();
    },
  );
});

describe("runEventPushDispatch: colaboradores", () => {
  const worker = recipient({ role: "worker" });

  it("recibe lo de las secciones permitidas", async () => {
    const deps = setup({}, [sub()], [event()], [worker]);
    await runEventPushDispatch(deps, options);

    expect(deps.loadAllowedSections).toHaveBeenCalledWith(worker);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("no recibe lo de secciones que no tiene, y el cursor avanza", async () => {
    const deps = setup(
      {
        loadAllowedSections: vi
          .fn()
          .mockResolvedValue(new Set(["/obligaciones"])),
      },
      [sub()],
      [event({ scope: "tramite" })],
      [worker],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it("si no se pueden leer sus secciones se salta sin avanzar (se reintenta)", async () => {
    const deps = setup(
      { loadAllowedSections: vi.fn().mockResolvedValue(null) },
      [sub()],
      [event()],
      [worker],
    );
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
    expect(summary.skipped).toBe(1);
  });

  it("si leer sus secciones lanza, se salta igual", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup(
      { loadAllowedSections: vi.fn().mockRejectedValue(new Error("bd")) },
      [sub()],
      [event()],
      [worker],
    );
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("un colaborador sin novedades de su cliente no consulta sus secciones", async () => {
    const deps = setup({}, [sub()], [event({ partnerId: 999 })], [worker]);
    await runEventPushDispatch(deps, options);

    expect(deps.loadAllowedSections).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
  });

  it("un cliente no consulta secciones", async () => {
    const deps = setup();
    await runEventPushDispatch(deps, options);

    expect(deps.loadAllowedSections).not.toHaveBeenCalled();
  });
});

describe("runEventPushDispatch: foto inicial", () => {
  it("un dispositivo sin cursor parte del último evento sin mandar nada", async () => {
    const deps = setup({}, [sub({ lastEventSeq: null })]);
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 50);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.listMatureEvents).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("con dispositivos nuevos y otros al día, procesa solo a los que tienen cursor", async () => {
    const deps = setup({}, [
      sub({ id: "new", userId: "u1", lastEventSeq: null }),
      sub({ id: "old", userId: "u1", lastEventSeq: 5 }),
    ]);
    await runEventPushDispatch(deps, options);

    expect(deps.advanceCursors).toHaveBeenCalledWith(["new"], 50);
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: "old" }),
      expect.anything(),
    );
  });
});

describe("runEventPushDispatch: sin novedades", () => {
  it("sin suscripciones no hace nada", async () => {
    const deps = setup({}, [], []);
    const summary = await runEventPushDispatch(deps, options);

    expect(summary).toEqual({
      users: 0,
      sent: 0,
      removed: 0,
      skipped: 0,
      truncated: false,
      locked: false,
    });
    expect(deps.listMatureEvents).not.toHaveBeenCalled();
  });

  it("sin eventos nuevos no manda, no avanza y no consulta clientes", async () => {
    const deps = setup({}, [sub()], []);
    await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).not.toHaveBeenCalled();
    expect(deps.fetchPartnerIds).not.toHaveBeenCalled();
  });
});

describe("runEventPushDispatch: resultado del envío", () => {
  it("gone: borra la suscripción y no avanza su cursor", async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue("gone") });
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.deleteByIds).toHaveBeenCalledWith(["s1"]);
    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
    expect(summary.removed).toBe(1);
  });

  it("error transitorio: no avanza, para reintentar, y no cuenta como rechazo", async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue("error") });
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
    expect(deps.saveFailureCount).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ sent: 0, skipped: 1 });
  });

  it("rechazo: cuenta el fallo y no avanza ni borra", async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue("rejected") }, [
      sub({ failureCount: 2 }),
    ]);
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.saveFailureCount).toHaveBeenCalledWith("s1", 3);
    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
    expect(deps.deleteByIds).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("tras el máximo de rechazos seguidos se da de baja si otros envíos funcionan", async () => {
    const deps = setup(
      {
        send: vi.fn().mockResolvedValueOnce("rejected").mockResolvedValue("ok"),
      },
      [
        sub({
          id: "s1",
          userId: "u1",
          failureCount: MAX_CONSECUTIVE_REJECTIONS - 1,
        }),
        sub({ id: "s2", userId: "u1" }),
      ],
    );
    await runEventPushDispatch(deps, options);

    expect(deps.deleteByIds).toHaveBeenCalledWith(["s1"]);
  });

  it("si no sale ningún envío bien (fallo del servidor) no se da de baja a nadie", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup({ send: vi.fn().mockResolvedValue("rejected") }, [
      sub({ failureCount: MAX_CONSECUTIVE_REJECTIONS }),
    ]);
    await runEventPushDispatch(deps, options);

    expect(deps.deleteByIds).not.toHaveBeenCalled();
  });

  it("un envío correcto pone a cero los fallos acumulados, y solo si había", async () => {
    const withFailures = setup({}, [sub({ failureCount: 4 })]);
    await runEventPushDispatch(withFailures, options);
    expect(withFailures.saveFailureCount).toHaveBeenCalledWith("s1", 0);

    const clean = setup();
    await runEventPushDispatch(clean, options);
    expect(clean.saveFailureCount).not.toHaveBeenCalled();
  });
});

describe("runEventPushDispatch: robustez", () => {
  it("si falla un dispositivo, los demás se procesan igual", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup(
      {
        send: vi
          .fn()
          .mockRejectedValueOnce(new Error("x"))
          .mockResolvedValue("ok"),
      },
      [sub({ id: "s1" }), sub({ id: "s2" })],
    );
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ sent: 1, skipped: 1 });
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s2"], 6);
  });

  it("si falla avanzar los cursores no lanza (se reintenta en el siguiente pulso)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup({
      advanceCursors: vi.fn().mockRejectedValue(new Error("bd")),
    });

    await expect(runEventPushDispatch(deps, options)).resolves.toMatchObject({
      sent: 1,
    });
    expect(deps.releaseLock).toHaveBeenCalledTimes(1);
  });

  it("si falla el borrado final devuelve igualmente el resumen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup({
      send: vi.fn().mockResolvedValue("gone"),
      deleteByIds: vi.fn().mockRejectedValue(new Error("bd")),
    });
    const summary = await runEventPushDispatch(deps, options);

    expect(summary.removed).toBe(0);
  });

  it("al llegar el límite de tiempo deja de procesar y lo indica", async () => {
    const deps = setup({ now: () => NOW + 60_000 });
    const summary = await runEventPushDispatch(deps, {
      deadlineAt: NOW + 45_000,
    });

    expect(deps.send).not.toHaveBeenCalled();
    expect(summary.truncated).toBe(true);
    expect(deps.advanceCursors).toHaveBeenCalledWith([], 6);
  });

  it("si hay tantos eventos como el lote, lo indica para que siga la siguiente ejecución", async () => {
    const many = Array.from({ length: EVENT_BATCH_SIZE }, (_, i) =>
      event({ seq: 6 + i, eventId: `e${i}`, partnerId: 999 }),
    );
    const deps = setup({}, [sub()], many);
    const summary = await runEventPushDispatch(deps, options);

    expect(summary.truncated).toBe(true);
    expect(deps.advanceCursors).toHaveBeenCalledWith(
      ["s1"],
      6 + EVENT_BATCH_SIZE - 1,
    );
  });

  it("con menos eventos que el lote no marca truncado", async () => {
    const deps = setup();
    expect((await runEventPushDispatch(deps, options)).truncated).toBe(false);
  });
});

describe("runEventPushDispatch: cerrojo", () => {
  it("si otra ejecución lo tiene no hace nada y no lo suelta", async () => {
    const deps = setup({ acquireLock: vi.fn().mockResolvedValue(false) });
    const summary = await runEventPushDispatch(deps, options);

    expect(summary.locked).toBe(true);
    expect(deps.listSubscriptions).not.toHaveBeenCalled();
    expect(deps.releaseLock).not.toHaveBeenCalled();
  });

  it("lo suelta al terminar y también si la ejecución falla", async () => {
    const ok = setup();
    await runEventPushDispatch(ok, options);
    expect(ok.releaseLock).toHaveBeenCalledTimes(1);

    const failing = setup({
      listSubscriptions: vi.fn().mockRejectedValue(new Error("bd")),
    });
    await expect(runEventPushDispatch(failing, options)).rejects.toThrow("bd");
    expect(failing.releaseLock).toHaveBeenCalledTimes(1);
  });
});

describe("runEventPushDispatch: mensajes ya leídos", () => {
  it("no avisa de un mensaje que el usuario ya leyó y aun así avanza el cursor", async () => {
    const deps = setup({
      fetchReadState: vi.fn().mockResolvedValue(new Map([["task:99", 10]])),
    });
    const summary = await runEventPushDispatch(deps, options);

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.advanceCursors).toHaveBeenCalledWith(["s1"], 6);
    expect(summary.sent).toBe(0);
  });

  it("avisa si el mensaje es posterior a lo leído", async () => {
    const deps = setup({
      fetchReadState: vi.fn().mockResolvedValue(new Map([["task:99", 9]])),
    });
    await runEventPushDispatch(deps, options);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("una consulta se compara con el estado de los tickets, no de las tareas", async () => {
    const readTask = setup(
      { fetchReadState: vi.fn().mockResolvedValue(new Map([["task:99", 10]])) },
      [sub()],
      [event({ scope: "consulta" })],
    );
    await runEventPushDispatch(readTask, options);
    expect(readTask.send).toHaveBeenCalledTimes(1);

    const readTicket = setup(
      {
        fetchReadState: vi.fn().mockResolvedValue(new Map([["ticket:99", 10]])),
      },
      [sub()],
      [event({ scope: "consulta" })],
    );
    await runEventPushDispatch(readTicket, options);
    expect(readTicket.send).not.toHaveBeenCalled();
  });

  it("lo leído no tapa otros eventos del mismo registro", async () => {
    const deps = setup(
      { fetchReadState: vi.fn().mockResolvedValue(new Map([["task:99", 10]])) },
      [sub()],
      [
        event(),
        event({
          seq: 7,
          eventId: "st:1",
          kind: "status",
          messageId: null,
          stateLabel: "Hecho",
          previousStateLabel: "En curso",
          excerpt: null,
        }),
      ],
    );
    await runEventPushDispatch(deps, options);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("si no se puede leer el estado de lectura, avisa igualmente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = setup({
      fetchReadState: vi.fn().mockRejectedValue(new Error("caído")),
    });
    await runEventPushDispatch(deps, options);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("no consulta el estado de lectura si no hay mensajes", async () => {
    const deps = setup(
      {},
      [sub()],
      [event({ kind: "new_record", messageId: null, excerpt: null })],
    );
    await runEventPushDispatch(deps, options);
    expect(deps.fetchReadState).not.toHaveBeenCalled();
  });
});
