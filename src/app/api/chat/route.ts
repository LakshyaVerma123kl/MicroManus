import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getModelById, calculateCost } from '@/lib/models';
import { decrypt } from '@/lib/crypto';
import { braveSearch } from '@/lib/tools/web-search';
import { generateReportPDF } from '@/lib/tools/report-generator';

const ChatBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1),
  modelId: z.string().min(1),
  chatId: z.string().uuid().optional(),
});

function createProvider(provider: string, apiKey: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChatBodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, modelId, chatId } = parsed.data;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify user has credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits <= 0) {
      return new Response(
        JSON.stringify({ error: 'No credits remaining. Please add more credits to continue.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get model info
    const modelInfo = getModelById(modelId);
    if (!modelInfo) {
      return new Response('Invalid model', { status: 400 });
    }

    // Verify chat ownership (if chatId provided)
    if (chatId) {
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();

      if (!chat) {
        return new Response(
          JSON.stringify({ error: 'Chat not found or access denied' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user API key for the provider
    const { data: apiKeyRow } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider', modelInfo.provider)
      .single();

    if (!apiKeyRow) {
      return new Response(
        JSON.stringify({ error: `No API key configured for ${modelInfo.provider}. Go to API Keys to add one.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt the API key
    const decryptedKey = decrypt(apiKeyRow.encrypted_key);
    const providerInstance = createProvider(modelInfo.provider, decryptedKey);
    const model = providerInstance(modelInfo.modelId);

    const result = await streamText({
      model,
      system: `You are MicroManus, a deep research AI agent. You have access to web search to find real-time information.

Your capabilities:
1. **Web Search**: Use the web_search tool to find current information on any topic. Always search when the user asks about recent events, data, or anything that requires up-to-date information.
2. **Report Generation**: Use the generate_report tool when the user explicitly asks for a report or PDF.

Behavior guidelines:
- Think step by step. If a question is complex, break it down and search multiple times.
- Always cite your sources with URLs when providing information from search results.
- Be thorough but concise. Synthesize information, don't just copy-paste search results.
- If you need more information, search again with a refined query.
- Format your responses with markdown for readability.`,
      messages,
      tools: {
        web_search: tool({
          description: 'Search the web for current information on any topic. Use this for recent events, facts, data, or anything requiring up-to-date info.',
          parameters: z.object({
            query: z.string().describe('The search query'),
          }),
          execute: async ({ query }) => {
            const results = await braveSearch(query);
            return {
              query,
              results: results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
              })),
            };
          },
        }),
        generate_report: tool({
          description: 'Generate a PDF research report. Use when the user asks for a report, document, or PDF.',
          parameters: z.object({
            title: z.string().describe('Report title'),
            content: z.string().describe('Full report content in markdown format'),
          }),
          execute: async ({ title, content }) => {
            try {
              const pdfBuffer = generateReportPDF(title, content, 'MicroManus AI');
              const fileName = `report-${Date.now()}.pdf`;

              // Store in Supabase Storage
              const { data, error } = await supabase.storage
                .from('reports')
                .upload(`${user.id}/${fileName}`, pdfBuffer, {
                  contentType: 'application/pdf',
                });

              if (error) {
                return { success: false, error: error.message };
              }

              const { data: urlData } = supabase.storage
                .from('reports')
                .getPublicUrl(data.path);

              return {
                success: true,
                fileName,
                url: urlData.publicUrl,
                message: `Report "${title}" generated successfully.`,
              };
            } catch (err) {
              return {
                success: false,
                error: err instanceof Error ? err.message : 'PDF generation failed',
              };
            }
          },
        }),
      },
      maxSteps: 8,
      onFinish: async ({ usage }) => {
        if (usage && chatId) {
          const inputTokens = usage.promptTokens || 0;
          const outputTokens = usage.completionTokens || 0;
          const cost = calculateCost(modelInfo, inputTokens, outputTokens, 0);

          // Log usage
          await supabase.from('usage_logs').insert({
            chat_id: chatId,
            user_id: user.id,
            model: modelInfo.id,
            provider: modelInfo.provider,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_tokens: 0,
            cost_usd: cost,
          });

          // Deduct 1 credit per chat completion
          await supabase.rpc('add_credits', {
            user_id_input: user.id,
            amount: -1,
          });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
