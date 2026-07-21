import crypto from "crypto";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  keyHash: string;
  name: string;
  rateLimit: number;
  createdAt: string;
}

const apiKeys: ApiKeyRecord[] = [];

export async function createApiKey(userId: string, name: string): Promise<{ record: ApiKeyRecord; plainKey: string }> {
  const plainKey = `sr_live_${crypto.randomBytes(24).toString("hex")}`;
  const record: ApiKeyRecord = {
    id: `key_${Date.now()}`,
    userId,
    keyHash: crypto.createHash("sha256").update(plainKey).digest("hex"),
    name,
    rateLimit: 1000,
    createdAt: new Date().toISOString(),
  };
  apiKeys.push(record);
  return { record, plainKey };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  return apiKeys.filter((k) => k.userId === userId);
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const idx = apiKeys.findIndex((k) => k.id === keyId && k.userId === userId);
  if (idx !== -1) apiKeys.splice(idx, 1);
}
