import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all usage logs with chat info
  const { data: logs } = await supabase
    .from('usage_logs')
    .select(`
      *,
      chats (title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Get aggregated stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  // Calculate totals
  const totalCost = logs?.reduce((sum, l) => sum + Number(l.cost_usd), 0) || 0;
  const totalInputTokens = logs?.reduce((sum, l) => sum + l.input_tokens, 0) || 0;
  const totalOutputTokens = logs?.reduce((sum, l) => sum + l.output_tokens, 0) || 0;
  const totalChats = new Set(logs?.map(l => l.chat_id)).size;

  return NextResponse.json({
    logs: logs || [],
    stats: {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalChats,
      credits: profile?.credits || 0,
    },
  });
}
