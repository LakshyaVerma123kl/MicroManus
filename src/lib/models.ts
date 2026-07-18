import { ModelInfo } from '@/types';

export const MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    cacheCostPer1M: 1.25,
    maxTokens: 16384,
    description: 'OpenAI\'s flagship multimodal model — fast and capable.',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    cacheCostPer1M: 0.075,
    maxTokens: 16384,
    description: 'Affordable and fast — great for everyday tasks.',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    cacheCostPer1M: 0.30,
    maxTokens: 8192,
    description: 'Anthropic\'s balanced model — excellent reasoning and writing.',
  },
  {
    id: 'claude-haiku-3.5',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    inputCostPer1M: 1.00,
    outputCostPer1M: 5.00,
    cacheCostPer1M: 0.10,
    maxTokens: 8192,
    description: 'Fast and affordable Claude — ideal for quick research.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    modelId: 'gemini-2.5-flash-preview-05-20',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    cacheCostPer1M: 0.0375,
    maxTokens: 65536,
    description: 'Google\'s fastest Gemini — huge context window, very affordable.',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    modelId: 'gemini-2.5-pro-preview-06-05',
    inputCostPer1M: 1.25,
    outputCostPer1M: 10.00,
    cacheCostPer1M: 0.315,
    maxTokens: 65536,
    description: 'Google\'s most capable model — deep reasoning and code.',
  },
];

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function calculateCost(
  model: ModelInfo,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number = 0
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  const cacheCost = (cacheTokens / 1_000_000) * model.cacheCostPer1M;
  return inputCost + outputCost + cacheCost;
}
