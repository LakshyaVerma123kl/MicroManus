import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { z } from 'zod';

const SaveKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  apiKey: z.string().min(8, 'API key too short'),
  model: z.string().optional(),
});

const DeleteKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
});

// Get API keys for current user (never return actual keys)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, provider, model, created_at')
    .eq('user_id', user.id);

  return NextResponse.json({ keys: keys || [] });
}

// Save/update API key (encrypted)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = SaveKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    );
  }

  const { provider, apiKey, model } = parsed.data;

  // Encrypt the key before storing
  const encryptedKey = encrypt(apiKey);

  const { error } = await supabase
    .from('api_keys')
    .upsert(
      {
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        model: model || 'default',
      },
      { onConflict: 'user_id,provider' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Delete API key
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = DeleteKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', parsed.data.provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
