import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const supabase = getServerSupabaseClient();

  const [{ data: team, error: teamError }, { data: records, error: recordsError }] = await Promise.all([
    supabase.from('team_members').select('name,wfh_days').order('name'),
    supabase
      .from('daily_attendance')
      .select('id,attendance_date,staff_name,leave_type,note,created_at,updated_at')
      .eq('attendance_date', date)
      .order('staff_name'),
  ]);

  if (teamError || recordsError) {
    return NextResponse.json(
      { error: teamError?.message || recordsError?.message || 'Failed to load data' },
      { status: 500 }
    );
  }

  return NextResponse.json({ team: team ?? [], records: records ?? [] });
}
