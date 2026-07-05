import { createHash, randomBytes } from 'node:crypto';

import {
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { Static } from 'typebox';
import t from 'typebox';
import { Value } from 'typebox/value';

export function base64UrlToBuffer(value: string): Uint8Array {
  return Buffer.from(value, 'base64url');
}

export function randomBase64Url(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashSHA256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** TypeBox schema for validating the client's WebAuthn authentication response */
export const AuthenticationResponseSchema = t.Object(
  {
    id: t.String(),
    rawId: t.String(),
    type: t.Literal('public-key'),
    response: t.Object({
      clientDataJSON: t.String(),
      authenticatorData: t.String(),
      signature: t.String(),
      userHandle: t.Optional(t.String()),
    }),
    clientExtensionResults: t.Object({}, { additionalProperties: true }),
  },
  { additionalProperties: true },
);

export type IAuthenticationResponse = Static<typeof AuthenticationResponseSchema>;

const validTransports = new Set<string>([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);

function castTransports(transports?: string[]): AuthenticatorTransportFuture[] | undefined {
  if (!transports) return undefined;
  for (const t of transports) {
    if (!validTransports.has(t)) {
      throw new Error(`invalid transport: ${t}`);
    }
  }
  return transports as AuthenticatorTransportFuture[];
}

export async function generatePasskeyAuthenticationOptions(params: {
  rpId: string;
  credentials?: { credentialId: string; transports?: string[] }[];
}) {
  const credentials = params.credentials ?? [];
  if (credentials.length > 0) {
    const options = await generateAuthenticationOptions({
      rpID: params.rpId,
      userVerification: 'required',
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: castTransports(cred.transports),
      })),
    });
    return { options };
  }

  // Usernameless mode: no allowCredentials — browser shows native account selector
  const options = await generateAuthenticationOptions({
    rpID: params.rpId,
    userVerification: 'required',
  });

  const cleanOptions = { ...options, allowCredentials: undefined };
  return { options: cleanOptions };
}

export async function verifyPasskeyAuthentication(params: {
  rpId: string;
  origin: string;
  expectedChallenge: string;
  credential: {
    credentialId: string;
    publicKey: string;
    counter: number;
    transports?: string[];
    webauthnUserId?: string;
  };
  response: unknown;
}) {
  const response = Value.Parse(AuthenticationResponseSchema, params.response);
  const result = await verifyAuthenticationResponse({
    response: response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: params.origin,
    expectedRPID: params.rpId,
    credential: {
      id: params.credential.credentialId,
      publicKey: base64UrlToBuffer(params.credential.publicKey),
      counter: params.credential.counter,
      transports: castTransports(params.credential.transports),
    },
    requireUserVerification: true,
  });

  const info = result.authenticationInfo;
  const userHandle = response.response.userHandle ?? '';
  const expectedUserHandle = params.credential.webauthnUserId ?? '';
  const userHandleMatches = !expectedUserHandle || !userHandle || userHandle === expectedUserHandle;

  return {
    verified: result.verified && userHandleMatches,
    credentialId: info?.credentialID ?? params.credential.credentialId,
    newCounter: info?.newCounter ?? params.credential.counter,
    userVerified: info?.userVerified,
    userHandle,
  };
}
