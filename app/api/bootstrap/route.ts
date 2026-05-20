import { NextRequest, NextResponse } from 'next/server';
import { TEAM_MEMBERS } from '@/lib/constants';
import { getServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();

  const [{ data: records, error: recordsError }, { data: wfhRows, error: wfhError }] = await Promise.all([
    supabase
      .from('daily_attendance')
      .select('id,attendance_date,name,leave_type,note,created_at,updated_at')
      .eq('attendance_date', date)
      .order('name'),
    supabase.from('wfh_schedule').select('name,day').order('name'),
  ]);

  if (recordsError || wfhError) {
    return NextResponse.json(
      { error: recordsError?.message || wfhError?.message || 'Failed to load data' },
      { status: 500 }
    );
  }

  const wfhMap = new Map<string, string[]>();
  (wfhRows ?? []).forEach((row) => {
    const days = wfhMap.get(row.name) ?? [];
    days.push(row.day);
    wfhMap.set(row.name, days);
  });

  const team = TEAM_MEMBERS.map((name) => ({
    name,
    wfh_days: wfhMap.get(name) ?? [],
  }));

  return NextResponse.json({ team, records: records ?? [] });
}
