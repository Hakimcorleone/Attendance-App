import { NextResponse } from 'next/server';
import { LEAVE_TYPES } from '@/lib/constants';
import { getServerSupabaseClient } from '@/lib/supabase';

type DailyPayload = {
  actorName?: string;
  adminPin?: string;
  attendanceDate?: string;
  staffName?: string;
  leaveType?: string;
  note?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DailyPayload;
  const { actorName, adminPin, attendanceDate, staffName, leaveType, note } = body;

  if (!actorName || !attendanceDate || !staffName || !leaveType) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  if (!LEAVE_TYPES.includes(leaveType as (typeof LEAVE_TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid leave type.' }, { status: 400 });
  }

  const isAdmin = actorName === 'Admin';
  const validAdminPin = adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;

  if (isAdmin && !validAdminPin) {
    return NextResponse.json({ error: 'Invalid admin PIN.' }, { status: 403 });
  }

  if (!isAdmin && actorName !== staffName) {
    return NextResponse.json({ error: 'You can only submit for yourself.' }, { status: 403 });
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.from('daily_attendance').upsert(
    {
      attendance_date: attendanceDate,
      staff_name: staffName,
      leave_type: leaveType,
      note: note?.trim() || null,
    },
    { onConflict: 'attendance_date,staff_name' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
