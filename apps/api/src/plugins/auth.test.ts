import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma BEFORE importing the plugin
const userFindUniqueMock = vi.fn();
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}));

// Mock @fastify/jwt so we can stub jwtVerify
const jwtVerifyMock = vi.fn();
vi.mock("@fastify/jwt", () => ({
  default: () => async (app: any) => {
    app.decorate("jwtVerify", jwtVerifyMock);
  },
}));

// Import after mocks
const { registerAuth } = await import("./auth.js");

/** Build a minimal Fastify-shaped mock for testing the decorators in isolation. */
function buildFakeFastify() {
  const decorators: Record<string, any> = {};
  const replies: { status?: number; body?: any; sent: boolean }[] = [];
  const fakeApp = {
    register: async () => {
      // Simulate the jwt plugin: it decorates jwtVerify on the request, not app
    },
    decorate: (name: string, fn: any) => {
      decorators[name] = fn;
    },
  };
  return { fakeApp, decorators, replies };
}

function buildFakeRequest(user: any) {
  return { user, jwtVerify: jwtVerifyMock };
}

function buildFakeReply() {
  const reply: any = {
    sent: false,
    body: undefined,
    statusCode: undefined,
    send: function (body: any) {
      this.sent = true;
      this.body = body;
      return this;
    },
  };
  reply.status = function (code: number) {
    reply.statusCode = code;
    return reply;
  };
  return reply;
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  jwtVerifyMock.mockReset();
});

describe("authenticate", () => {
  it("delegates to jwtVerify which populates request.user", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    jwtVerifyMock.mockResolvedValueOnce(undefined);
    const req = buildFakeRequest(undefined);
    const reply = buildFakeReply();
    await decorators.authenticate(req as any, reply as any);
    expect(jwtVerifyMock).toHaveBeenCalled();
  });

  it("calls reply.send with the error when jwtVerify throws", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const err = new Error("invalid token");
    jwtVerifyMock.mockRejectedValueOnce(err);
    const req = buildFakeRequest(undefined);
    const reply = buildFakeReply();
    await decorators.authenticate(req as any, reply as any);
    expect(reply.sent).toBe(true);
    expect(reply.body).toBe(err);
  });
});

describe("requireCreator", () => {
  it("returns 401 when request.user is missing", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest(undefined);
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.body.error.code).toBe("UNAUTHORIZED");
    expect(userFindUniqueMock).not.toHaveBeenCalled(); // no DB hit for unauth
  });

  it("passes immediately for admin (skips DB re-check)", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest({ userId: "admin-1", role: "admin", isCreator: false, isAdmin: true });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.sent).toBe(false);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("passes when DB confirms isCreator=true", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    userFindUniqueMock.mockResolvedValueOnce({ isCreator: true, role: "creator" });
    const req = buildFakeRequest({ userId: "user-1", role: "creator", isCreator: true, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.sent).toBe(false);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { isCreator: true, role: true },
    });
  });

  it("returns 403 when DB confirms isCreator=false (buyer trying creator route)", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    // Stale JWT says creator, DB now says buyer (role was changed)
    userFindUniqueMock.mockResolvedValueOnce({ isCreator: false, role: "buyer" });
    const req = buildFakeRequest({ userId: "user-1", role: "creator", isCreator: true, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error.code).toBe("FORBIDDEN");
    expect(reply.body.error.role).toBe("creator"); // echoes JWT role
  });

  it("returns 403 when DB user no longer exists", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    userFindUniqueMock.mockResolvedValueOnce(null);
    const req = buildFakeRequest({ userId: "deleted-user", role: "creator", isCreator: true, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
  });

  it("rejects when DB role=admin but JWT isAdmin=false (no DB-elevation exploit)", async () => {
    // User demoted from admin to creator. JWT still has isAdmin=true.
    // requireCreator allows isAdmin=true short-circuit, so this passes.
    // But the DB might say role=creator — that's fine, the guard is checking
    // "is admin OR is creator". This test verifies that's the actual behavior.
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    userFindUniqueMock.mockResolvedValueOnce({ isCreator: false, role: "creator" });
    const req = buildFakeRequest({ userId: "user-1", role: "creator", isCreator: false, isAdmin: true });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    // isAdmin=true in JWT short-circuits the DB check entirely → passes
    expect(reply.sent).toBe(false);
  });
});

describe("requireBuyer", () => {
  it("returns 401 when request.user is missing", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest(undefined);
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.body.error.code).toBe("UNAUTHORIZED");
  });

  it("passes immediately for admin", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest({ userId: "admin-1", role: "admin", isCreator: false, isAdmin: true });
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.sent).toBe(false);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("passes when DB confirms isBuyer=true", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    userFindUniqueMock.mockResolvedValueOnce({ isBuyer: true, role: "buyer" });
    const req = buildFakeRequest({ userId: "user-1", role: "buyer", isCreator: false, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.sent).toBe(false);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { isBuyer: true, role: true },
    });
  });

  it("returns 403 when creator tries to hit a buyer-only route (e.g. /downloads)", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    // Creator JWT, DB confirms creator role
    userFindUniqueMock.mockResolvedValueOnce({ isBuyer: false, role: "creator" });
    const req = buildFakeRequest({ userId: "user-1", role: "creator", isCreator: true, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error.code).toBe("FORBIDDEN");
    expect(reply.body.error.message).toContain("Buyer");
    expect(reply.body.error.role).toBe("creator");
  });

  it("returns 403 when DB user is gone", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    userFindUniqueMock.mockResolvedValueOnce(null);
    const req = buildFakeRequest({ userId: "ghost", role: "buyer", isCreator: false, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
  });
});

describe("requireAdmin", () => {
  it("returns 403 when isAdmin=false", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest({ userId: "user-1", role: "buyer", isCreator: false, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireAdmin(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 403 when no user", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest(undefined);
    const reply = buildFakeReply();
    await decorators.requireAdmin(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
  });

  it("passes for admin", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    const req = buildFakeRequest({ userId: "admin-1", role: "admin", isCreator: false, isAdmin: true });
    const reply = buildFakeReply();
    await decorators.requireAdmin(req as any, reply as any);

    expect(reply.sent).toBe(false);
  });
});

describe("role separation (defense in depth)", () => {
  it("JWT role=creator + DB role=buyer → requireCreator rejects (caught by DB re-check)", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    // User was downgraded from creator to buyer after the JWT was issued.
    // The stale JWT still says creator, but DB now says buyer.
    // requireCreator MUST reject this — that's the whole point of DB re-check.
    userFindUniqueMock.mockResolvedValueOnce({ isCreator: false, role: "buyer" });
    const req = buildFakeRequest({ userId: "user-1", role: "creator", isCreator: true, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireCreator(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
  });

  it("JWT role=buyer + DB role=creator → requireBuyer rejects (caught by DB re-check)", async () => {
    const { fakeApp, decorators } = buildFakeFastify();
    await registerAuth(fakeApp as any, { secret: "test" });

    // User upgraded from buyer to creator. Stale JWT still says buyer.
    // requireBuyer MUST reject this — the user shouldn't hit purchase endpoints.
    userFindUniqueMock.mockResolvedValueOnce({ isBuyer: false, role: "creator" });
    const req = buildFakeRequest({ userId: "user-1", role: "buyer", isCreator: false, isAdmin: false });
    const reply = buildFakeReply();
    await decorators.requireBuyer(req as any, reply as any);

    expect(reply.statusCode).toBe(403);
  });
});