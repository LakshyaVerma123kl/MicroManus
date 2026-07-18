import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, credits')
          .eq('id', user.id)
          .single();

        if (!profile) {
          // New user — create profile
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
            credits: 0,
          });
          // New user always goes to paywall
          return NextResponse.redirect(`${origin}/paywall`);
        }

        // Returning user — go to dashboard if they have credits, paywall otherwise
        if (profile.credits > 0) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
        return NextResponse.redirect(`${origin}/paywall`);
      }

      return NextResponse.redirect(`${origin}/paywall`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
