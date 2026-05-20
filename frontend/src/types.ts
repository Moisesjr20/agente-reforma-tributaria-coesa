export interface Source {
  slug: string;
  title: string;
  similarity: number;
}

export interface ApiResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  latency_ms: number;
  model_used: string;
}

export type Role = 'user' | 'ai';

export interface Message {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  confidence?: number;
  latency_ms?: number;
  model_used?: string;
  timestamp: Date;
}
