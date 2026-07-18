import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().default(''),
  toolInvocations: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify chat ownership
  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  // Verify chat ownership before inserting
  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: id,
      role: parsed.data.role,
      content: parsed.data.content,
      tool_result: parsed.data.toolInvocations,
    })
    .select()
    .single();

  // Update chat's updated_at
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message });
}
