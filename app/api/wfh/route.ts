import { NextResponse } from 'next/server';
import { WEEKDAYS } from '@/lib/constants';
import { getServerSupabaseClient } from '@/lib/supabase';

type WfhPayload = {
  adminPin?: string;
  staffName?: string;
  wfhDays?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as WfhPayload;
  const { adminPin, staffName, wfhDays } = body;

  if (adminPin !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid admin PIN.' }, { status: 403 });
  }

  if (!staffName || !Array.isArray(wfhDays)) {
    return NextResponse.json({ error: 'Missing staffName or wfhDays.' }, { status: 400 });
  }

  if (wfhDays.length > 2 || wfhDays.some((day) => !WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]))) {
    return NextResponse.json({ error: 'WFH days must be 0 to 2 valid weekdays.' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('team_members')
    .update({ wfh_days: wfhDays })
    .eq('name', staffName);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
