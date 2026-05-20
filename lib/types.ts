export type LeaveType = 'AL' | 'MC' | 'EL' | 'RL' | 'PL' | 'ML' | 'HL' | 'CL' | 'Others';

export type WfhRecord = {
  id?: string;
  name: string;
  day: string;
  created_at?: string;
  updated_at?: string;
};

export type TeamMember = {
  name: string;
  wfh_days: string[];
};

export type DailyRecord = {
  id?: string;
  attendance_date: string;
  name: string;
  leave_type: LeaveType;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};
