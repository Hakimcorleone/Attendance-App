import { NextResponse } from 'next/server';
import { LEAVE_TYPES } from '@/lib/constants';
import { getServerSupabaseClient } from '@/lib/supabase';

type DailyPayload = {
  actorName?: string;
  adminPin?: string;
  attendanceDate?: string;
  startDate?: string;
  endDate?: string;
  staffName?: string;
  leaveType?: string;
  note?: string;
  isHalfDay?: boolean;
};

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return [];

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(formatDateValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function POST(request: Request) {
  const body = (await request.json()) as DailyPayload;
  const {
    actorName,
    adminPin,
    attendanceDate,
    startDate,
    endDate,
    staffName,
    leaveType,
    note,
    isHalfDay,
  } = body;
  const firstDate = startDate || attendanceDate || '';
  const lastDate = endDate || firstDate;
  const dateRange = getDateRange(firstDate, lastDate);

  if (!actorName || dateRange.length === 0 || !staffName || !leaveType) {
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

  const trimmedNote = note?.trim() || '';
  const savedNote = [isHalfDay ? 'Half day' : '', trimmedNote].filter(Boolean).join(' - ');

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.from('daily_attendance').upsert(
    dateRange.map((date) => ({
      attendance_date: date,
      name: staffName,
      leave_type: leaveType,
      note: savedNote || null,
    })),
    { onConflict: 'attendance_date,name' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: dateRange.length });
}
