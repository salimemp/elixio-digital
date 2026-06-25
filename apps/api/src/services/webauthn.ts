import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { prisma } from "../lib/prisma.js";
import { env, webauthnOrigins } from "../config/env.js";
import { httpError } from "../lib/errors.js";
import {
  storeWebAuthnChallenge,
  consumeWebAuthnChallenge,
} from "./auth.js";

const RP_NAME = "Elixio Digital";
const RP_ID = env.ELIXIO_WEBAUTHN_RP_ID;

export async function beginPasskeyRegistration(userId: string, userEmail: string) {
  const existing = await prisma.passkey.findMany({ where: { userId } });
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userEmail,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports as never,
    })),
  });
  await storeWebAuthnChallenge(userId, options.challenge, "registration");
  return options;
}

export async function finishPasskeyRegistration(
  userId: string,
  response: { id: string; rawId?: string; response: { challenge?: string; clientDataJSON?: string; attestationObject?: string }; type?: string; clientExtensionResults?: unknown }
): Promise<{ id: string; name: string }> {
  // The client passes the challenge inside the response (via clientDataJSON
  // we re-derive it; or it's easier to require the client to send the
  // challenge string back so we can look it up directly).
  const challengeFromResponse = (response as { challenge?: string }).challenge;
  const challenge =
    challengeFromResponse ??
    parseChallengeFromClientData(response.response?.clientDataJSON);
  if (!challenge) throw httpError("Missing challenge in response", 400, "BAD_REQUEST");

  const consumed = await consumeWebAuthnChallenge(challenge);
  if (!consumed || consumed.userId !== userId) {
    throw httpError("Invalid or expired challenge", 400, "BAD_REQUEST");
  }

  const verification = await verifyRegistrationResponse({
    response: response as never,
    expectedChallenge: challenge,
    expectedOrigin: webauthnOrigins,
    expectedRPID: RP_ID,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw httpError("Passkey registration failed", 400, "BAD_REQUEST");
  }
  const info = verification.registrationInfo;
  const credential = info.credential as unknown as {
    id: string;
    publicKey: Uint8Array;
    counter: number;
    transports?: string[];
  };
  const credentialId = credential.id;
  const publicKey = isoBase64URL.fromBuffer(new Uint8Array(credential.publicKey));
  const counter = credential.counter;
  const transports = (credential.transports ?? []) as string[];
  const aaguid = (info.aaguid as string | undefined) ?? undefined;
  const name = `Passkey ${new Date().toLocaleDateString()}`;
  const created = await prisma.passkey.create({
    data: {
      userId,
      credentialId,
      publicKey,
      counter: BigInt(counter),
      transports,
      aaguid,
      name,
    },
  });
  return { id: created.id, name: created.name };
}

export async function beginPasskeyLogin() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  });
  await storeWebAuthnChallenge(null, options.challenge, "authentication");
  return options;
}

export async function finishPasskeyLogin(
  response: { id: string; rawId?: string; response: { challenge?: string; clientDataJSON?: string; authenticatorData?: string; signature?: string }; type?: string }
): Promise<{ userId: string }> {
  const challengeFromResponse = (response as { challenge?: string }).challenge;
  const challenge =
    challengeFromResponse ??
    parseChallengeFromClientData(response.response?.clientDataJSON);
  if (!challenge) throw httpError("Missing challenge in response", 400, "BAD_REQUEST");

  const consumed = await consumeWebAuthnChallenge(challenge);
  if (!consumed) throw httpError("Invalid or expired challenge", 400, "BAD_REQUEST");

  const credId = response.id;
  const passkey = await prisma.passkey.findUnique({ where: { credentialId: credId } });
  if (!passkey) throw httpError("Unknown credential", 400, "BAD_REQUEST");

  const verification = await verifyAuthenticationResponse({
    response: response as never,
    expectedChallenge: challenge,
    expectedOrigin: webauthnOrigins,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(isoBase64URL.toBuffer(passkey.publicKey)),
      counter: Number(passkey.counter),
      transports: passkey.transports as never,
    },
  });
  if (!verification.verified) throw httpError("Passkey authentication failed", 400, "BAD_REQUEST");

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });
  return { userId: passkey.userId };
}

export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      aaguid: true,
      transports: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deletePasskey(userId: string, passkeyId: string) {
  const passkey = await prisma.passkey.findUnique({ where: { id: passkeyId } });
  if (!passkey || passkey.userId !== userId) throw httpError("Not found", 404, "NOT_FOUND");
  await prisma.passkey.delete({ where: { id: passkeyId } });
}

// Decode the challenge out of the WebAuthn clientDataJSON so we can
// look it up server-side without trusting the client to send it
// alongside. clientDataJSON is JSON of the form
//   {"type":"...", "challenge":"<base64url>", "origin":"..."}
// We need the challenge string itself (base64url-encoded) to match
// against the server-stored value.
function parseChallengeFromClientData(b64?: string): string | null {
  if (!b64) return null;
  try {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return typeof json.challenge === "string" ? json.challenge : null;
  } catch {
    return null;
  }
}
