import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase';

type DeletePayload = {
  attendanceDate?: string;
  adminPin?: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const body = (await request.json()) as DeletePayload;
  const { attendanceDate, adminPin } = body;

  if (!attendanceDate) {
    return NextResponse.json({ error: 'attendanceDate is required.' }, { status: 400 });
  }

  if (adminPin !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid admin PIN.' }, { status: 403 });
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from('daily_attendance')
    .delete()
    .eq('attendance_date', attendanceDate)
    .eq('staff_name', decodeURIComponent(name));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
