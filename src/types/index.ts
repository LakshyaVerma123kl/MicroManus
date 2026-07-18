export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  credits: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google';
  encrypted_key: string;
  model: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  model: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_result?: Record<string, unknown>;
  created_at: string;
}

export interface UsageLog {
  id: string;
  chat_id: string;
  user_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  created_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  modelId: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  cacheCostPer1M: number;
  maxTokens: number;
  description: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatWithStats extends Chat {
  message_count?: number;
  total_cost?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
}
