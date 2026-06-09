import type { ApiResponse } from '../types';

const API_URL = 'https://hbfckolzpkdkzwjyvrah.supabase.co/functions/v1/ask-reforma';

export async function askReforma(question: string): Promise<ApiResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}
