import { exec } from 'child_process';
import fs from 'fs';

export async function safeFetch(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 6000,
  method = 'GET',
  body?: string
): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      body: body ? body : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...headers
      }
    });
    return res;
  } catch (err: any) {
    console.warn(`[Klyp Network] SafeFetch note (${url}):`, err.message || err.code);
    return null;
  } finally {
    clearTimeout(id);
  }
}

export async function downloadRemoteFile(url: string, destPath: string, timeoutMs = 15000): Promise<boolean> {
  try {
    const res = await safeFetch(url, {}, timeoutMs);
    if (!res || !res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    console.warn(`[Klyp Music] Failed to download remote file ${url}:`, err);
    return false;
  }
}

export function runCommandWithTimeout(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
