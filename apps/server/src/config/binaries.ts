import { exec } from 'child_process';

export function hasBinary(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`which ${cmd}`, (error) => {
      resolve(!error);
    });
  });
}

export function getEngineVersion(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`${cmd} --version`, { timeout: 3000 }, (err, stdout) => {
      if (err) resolve('N/A');
      else resolve(stdout.trim().split('\n')[0]);
    });
  });
}

export async function prewarmBinaries(): Promise<void> {
  await Promise.all([hasBinary('yt-dlp'), hasBinary('ffmpeg')]);
}
