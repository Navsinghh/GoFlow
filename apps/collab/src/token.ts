import { jwtVerify, SignJWT } from "jose";

/**
 * Short-lived proof, issued by the web app, that a user may open one flow
 * with a given role. The collaboration server only verifies the signature,
 * so it never needs to read sessions or recheck permissions itself.
 */
export interface CollabClaims {
  /** User id, or `guest:<random>` for public-link viewers. */
  sub: string;
  name: string;
  flow: string;
  role: "owner" | "editor" | "viewer";
}

const ISSUER = "flowcraft-web";
const AUDIENCE = "flowcraft-collab";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signCollabToken(claims: CollabClaims, secret: string, expiresIn = "1h") {
  const { sub, ...rest } = claims;
  return new SignJWT({ ...rest })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key(secret));
}

export async function verifyCollabToken(token: string, secret: string): Promise<CollabClaims> {
  const { payload } = await jwtVerify(token, key(secret), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
  const { sub, name, flow, role } = payload;
  if (typeof sub !== "string" || typeof name !== "string" || typeof flow !== "string") throw new Error("Malformed token");
  if (role !== "owner" && role !== "editor" && role !== "viewer") throw new Error("Malformed token");
  return { sub, name, flow, role };
}
