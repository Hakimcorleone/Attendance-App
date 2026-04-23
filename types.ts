export type LeaveType = 'AL' | 'MC' | 'EL' | 'RL' | 'PL' | 'ML' | 'HL' | 'CL' | 'Others';

export type TeamMember = {
  name: string;
  wfh_days: string[];
};

export type DailyRecord = {
  id?: string;
  attendance_date: string;
  staff_name: string;
  leave_type: LeaveType;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};
