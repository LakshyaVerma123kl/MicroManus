import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CouponSchema = z.object({
  code: z.string().min(1).max(50),
});

const VALID_COUPONS: Record<string, number> = {
  SID_DRDROID: 5,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid coupon format' }, { status: 400 });
    }

    const code = parsed.data.code.toUpperCase().trim();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = VALID_COUPONS[code];
    if (!credits) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    // Check if already redeemed
    const { data: existing } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_code', code)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Coupon already redeemed' }, { status: 400 });
    }

    // Record redemption
    await supabase.from('coupon_redemptions').insert({
      user_id: user.id,
      coupon_code: code,
      credits_granted: credits,
    });

    // Add credits
    await supabase.rpc('add_credits', { user_id_input: user.id, amount: credits });

    return NextResponse.json({ credits, message: `${credits} credits added!` });
  } catch (error) {
    console.error('Coupon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
