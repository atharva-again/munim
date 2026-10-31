import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getPool } from "./db/index.js";
export const authTables = {
  user: { modelName: "munim_auth_user" },
  session: { modelName: "munim_auth_session" },
  account: { modelName: "munim_auth_account" },
  verification: { modelName: "munim_auth_verification" },
};
let instance: ReturnType<typeof betterAuth> | undefined;
export function getAuth() {
  const database = getPool();
  const {
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseURL,
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
  } = process.env;
  if (!database || !secret || !baseURL || !clientId || !clientSecret)
    return null;
  const options: BetterAuthOptions = {
    ...authTables,
    database,
    secret,
    baseURL,
    socialProviders: { google: { clientId, clientSecret } },
    emailAndPassword: { enabled: false },
    advanced: { database: { generateId: "uuid" } },
  };
  return (instance ??= betterAuth(options));
}
export function accountBusinessId(user: {
  id: string;
  email: string;
  emailVerified: boolean;
}) {
  const owner = process.env.MUNIM_OWNER_EMAIL?.toLowerCase();
  return owner && user.emailVerified && user.email.toLowerCase() === owner
    ? (process.env.MUNIM_BUSINESS_ID ?? "demo-business")
    : `account:${user.id}`;
}
export type ApiEnv = {
  Variables: { businessId: string; authSessionId: string };
};
