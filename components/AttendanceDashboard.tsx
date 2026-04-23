'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDisplayDate, getDayName, getTodayDateValue } from '@/lib/date';
import { LEAVE_TYPES, TEAM_MEMBERS, WEEKDAYS } from '@/lib/constants';
import type { DailyRecord, TeamMember } from '@/lib/types';

type BootstrapResponse = {
  team: TeamMember[];
  records: DailyRecord[];
};

type TabKey = 'daily' | 'wfh' | 'dashboard';

export default function AttendanceDashboard() {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue());
  const [selectedTab, setSelectedTab] = useState<TabKey>('daily');
  const [selectedName, setSelectedName] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [note, setNote] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [wfhSelectedName, setWfhSelectedName] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const isAdmin = selectedUser === 'Admin';
  const currentDayName = getDayName(selectedDate);

  useEffect(() => {
    void loadData(selectedDate);
  }, [selectedDate]);

  async function loadData(date: string) {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/bootstrap?date=${date}`);
      const data: BootstrapResponse = await res.json();
      setTeam(data.team);
      setRecords(data.records);
    } catch {
      setMessage('Failed to load live data. Please refresh again.');
    } finally {
      setLoading(false);
    }
  }

  function handleIdentityChange(value: string) {
    setSelectedUser(value);
    setMessage('');
    if (value === 'Admin') {
      setSelectedName('');
      setSelectedTab('dashboard');
      return;
    }
    setSelectedName(value);
    setSelectedTab('daily');
    setSelectedDate(getTodayDateValue());
  }

  async function saveDailyRecord() {
    if (!selectedUser || !selectedName || !selectedLeaveType) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: selectedUser,
          adminPin,
          attendanceDate: selectedDate,
          staffName: selectedName,
          leaveType: selectedLeaveType,
          note,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || 'Unable to save record.');
        return;
      }

      setSelectedLeaveType('');
      setNote('');
      setMessage('Daily record saved successfully.');
      await loadData(selectedDate);
    } catch {
      setMessage('Unexpected error while saving.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(name: string) {
    if (!isAdmin) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/daily/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceDate: selectedDate, adminPin }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || 'Unable to remove record.');
        return;
      }
      setMessage('Record removed.');
      await loadData(selectedDate);
    } catch {
      setMessage('Unexpected error while removing record.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleWfhDay(day: string) {
    if (!isAdmin || !wfhSelectedName) return;
    setSaving(true);
    setMessage('');
    try {
      const member = team.find((item) => item.name === wfhSelectedName);
      const currentDays = member?.wfh_days ?? [];
      const exists = currentDays.includes(day);
      let nextDays = exists ? currentDays.filter((item) => item !== day) : [...currentDays, day];
      if (!exists && nextDays.length > 2) {
        setMessage('Maximum 2 WFH days only.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/wfh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPin, staffName: wfhSelectedName, wfhDays: nextDays }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || 'Unable to update WFH.');
        return;
      }
      setMessage('WFH schedule updated.');
      await loadData(selectedDate);
    } catch {
      setMessage('Unexpected error while updating WFH.');
    } finally {
      setSaving(false);
    }
  }

  const selectedPersonWfh = useMemo(
    () => team.find((person) => person.name === wfhSelectedName),
    [team, wfhSelectedName]
  );

  const peopleOnLeave = useMemo(() => records.map((record) => record.staff_name), [records]);

  const wfhToday = useMemo(
    () => team.filter((person) => person.wfh_days.includes(currentDayName) && !peopleOnLeave.includes(person.name)),
    [team, currentDayName, peopleOnLeave]
  );

  const inOfficeToday = useMemo(
    () => team.filter((person) => !person.wfh_days.includes(currentDayName) && !peopleOnLeave.includes(person.name)),
    [team, currentDayName, peopleOnLeave]
  );

  const leaveBreakdown = useMemo(
    () => LEAVE_TYPES.map((type) => ({
      type,
      count: records.filter((record) => record.leave_type === type).length,
      people: records.filter((record) => record.leave_type === type),
    })),
    [records]
  );

  return (
    <div className="container">
      <div className="shell">
        <div className="panel">
          <div className="panel-header">
            <h2 style={{ margin: 0 }}>Access Portal</h2>
            <p className="subtitle">Pilih nama dulu. Semua orang boleh tengok dashboard & WFH. Admin sahaja boleh edit.</p>
          </div>
          <div className="panel-body">
            <div style={{ marginBottom: 18 }}>
              <label className="label">Who are you?</label>
              <select className="select" value={selectedUser} onChange={(e) => handleIdentityChange(e.target.value)}>
                <option value="">Choose your name / Admin</option>
                <option value="Admin">Admin</option>
                {TEAM_MEMBERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="notice" style={{ marginBottom: 18 }}>
              <div className="section-title">Current Access</div>
              {!selectedUser ? (
                <div className="muted">Please choose identity first.</div>
              ) : isAdmin ? (
                <div className="muted">Admin can override daily records, manage any date, remove entries, and change WFH schedules.</div>
              ) : (
                <div className="muted">User mode auto-focuses on today for your own leave update, while still allowing view access to WFH and dashboard.</div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!isAdmin}
              />
              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                {isAdmin ? 'Admin boleh pilih mana-mana tarikh.' : 'User biasa auto guna tarikh hari ini.'}
              </div>
            </div>

            {isAdmin && (
              <div style={{ marginBottom: 18 }}>
                <label className="label">Admin PIN</label>
                <input
                  className="input"
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter admin PIN"
                />
              </div>
            )}

            <div className="card">
              <div className="section-title">Selected Date</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatDisplayDate(selectedDate)}</div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 className="title">Attendance + WFH Dashboard</h1>
              <p className="subtitle">Dark blue live app with daily attendance by date, shared dashboard view, and admin override controls.</p>
            </div>
            <div className="row">
              {selectedUser && <span className="badge">{isAdmin ? 'Admin Access' : `${selectedUser} View`}</span>}
              <span className="badge">{currentDayName}</span>
            </div>
          </div>

          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-label">Total Leave</div><div className="stat-value">{records.length}</div></div>
            <div className="stat-card"><div className="stat-label">WFH Today</div><div className="stat-value">{wfhToday.length}</div></div>
            <div className="stat-card"><div className="stat-label">In Office</div><div className="stat-value">{inOfficeToday.length}</div></div>
            <div className="stat-card"><div className="stat-label">Team Size</div><div className="stat-value">{team.length}</div></div>
          </div>

          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${selectedTab === 'daily' ? 'active' : ''}`} onClick={() => setSelectedTab('daily')}>Daily Update</button>
            <button className={`tab ${selectedTab === 'wfh' ? 'active' : ''}`} onClick={() => setSelectedTab('wfh')}>WFH Setup</button>
            <button className={`tab ${selectedTab === 'dashboard' ? 'active' : ''}`} onClick={() => setSelectedTab('dashboard')}>Dashboard</button>
          </div>

          {message && <div className="notice" style={{ marginBottom: 20 }}>{message}</div>}
          {loading && <div className="notice" style={{ marginBottom: 20 }}>Loading live data...</div>}

          {!loading && selectedTab === 'daily' && (
            <div className="panel">
              <div className="panel-header">
                <h2 style={{ margin: 0 }}>Daily Update by Date</h2>
                <p className="subtitle">User biasa update diri sendiri. Admin boleh pilih sesiapa dan override record.</p>
              </div>
              <div className="panel-body">
                <div className="grid-3" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="label">Name</label>
                    <select
                      className="select"
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      disabled={!selectedUser || !isAdmin}
                    >
                      <option value="">Select name</option>
                      {(isAdmin ? team.map((item) => item.name) : selectedUser ? [selectedUser] : []).map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Leave Type</label>
                    <select
                      className="select"
                      value={selectedLeaveType}
                      onChange={(e) => setSelectedLeaveType(e.target.value)}
                      disabled={!selectedUser}
                    >
                      <option value="">Select leave type</option>
                      {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Note</label>
                    <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" disabled={!selectedUser} />
                  </div>
                </div>

                <div className="row" style={{ marginBottom: 18 }}>
                  <button className="btn btn-primary" onClick={saveDailyRecord} disabled={saving || !selectedUser || !selectedName || !selectedLeaveType}>
                    {saving ? 'Saving...' : 'Save Daily Record'}
                  </button>
                </div>

                <div className="card">
                  <div className="kv" style={{ marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Current Records</div>
                      <div className="muted" style={{ fontSize: 14 }}>{formatDisplayDate(selectedDate)}</div>
                    </div>
                    <span className="badge">{records.length} record(s)</span>
                  </div>

                  <div className="list">
                    {records.length === 0 ? (
                      <div className="empty">No leave record for this date.</div>
                    ) : records.map((record) => (
                      <div className="record" key={record.staff_name}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar">{record.staff_name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{record.staff_name}</div>
                            <div className="muted" style={{ fontSize: 14 }}>{record.note || 'No note added'}</div>
                          </div>
                        </div>
                        <div className="row">
                          <span className="badge">{record.leave_type}</span>
                          {isAdmin && (
                            <button className="btn btn-danger" onClick={() => removeRecord(record.staff_name)} disabled={saving}>Remove</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && selectedTab === 'wfh' && (
            <div className="panel">
              <div className="panel-header">
                <h2 style={{ margin: 0 }}>WFH Setup</h2>
                <p className="subtitle">Semua orang boleh tengok jadual WFH. Admin sahaja boleh ubah pilihan hari untuk setiap orang.</p>
              </div>
              <div className="panel-body">
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="label">Choose Team Member</label>
                    <select className="select" value={wfhSelectedName} onChange={(e) => setWfhSelectedName(e.target.value)}>
                      <option value="">Select name</option>
                      {team.map((person) => <option key={person.name} value={person.name}>{person.name}</option>)}
                    </select>
                  </div>
                  <div className="card">
                    <div style={{ fontWeight: 700 }}>Selected WFH Pattern</div>
                    <div className="muted" style={{ marginTop: 8 }}>
                      {selectedPersonWfh ? `${selectedPersonWfh.name}: ${selectedPersonWfh.wfh_days.join(', ') || 'No day selected yet'}` : 'Select a team member first.'}
                    </div>
                  </div>
                </div>

                <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  {WEEKDAYS.map((day) => {
                    const active = selectedPersonWfh?.wfh_days.includes(day);
                    const disabled = !isAdmin || !wfhSelectedName || saving;
                    return (
                      <button
                        key={day}
                        className={`pill-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                        onClick={() => toggleWfhDay(day)}
                        disabled={disabled}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="muted" style={{ marginTop: 14 }}>Maximum 2 hari WFH untuk setiap orang. Semua user boleh view, admin sahaja boleh edit.</div>
              </div>
            </div>
          )}

          {!loading && selectedTab === 'dashboard' && (
            <div className="grid-2">
              <div className="panel">
                <div className="panel-header">
                  <h2 style={{ margin: 0 }}>Dashboard Summary</h2>
                  <p className="subtitle">Shared dashboard by selected date for all users.</p>
                </div>
                <div className="panel-body">
                  <div style={{ marginBottom: 22 }}>
                    <div className="section-title">Who is on leave</div>
                    <div className="list">
                      {records.length === 0 ? <div className="empty">No leave submitted for this date.</div> : records.map((record) => (
                        <div key={record.staff_name} className="record">
                          <div>
                            <div style={{ fontWeight: 700 }}>{record.staff_name}</div>
                            <div className="muted" style={{ fontSize: 14 }}>{record.note || 'No note'}</div>
                          </div>
                          <span className="badge">{record.leave_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <div className="section-title">Working from home</div>
                    <div className="row">
                      {wfhToday.length === 0 ? <div className="muted">No scheduled WFH on this day.</div> : wfhToday.map((person) => <span className="badge" key={person.name}>{person.name}</span>)}
                    </div>
                  </div>

                  <div>
                    <div className="section-title">In office</div>
                    <div className="row">
                      {inOfficeToday.map((person) => <span className="badge" key={person.name}>{person.name}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 style={{ margin: 0 }}>Leave Breakdown</h2>
                  <p className="subtitle">Quick category view for everyone.</p>
                </div>
                <div className="panel-body list">
                  {leaveBreakdown.map((group) => (
                    <div className="card" key={group.type}>
                      <div className="kv" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{group.type}</div>
                        <span className="badge">{group.count}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 14 }}>{group.people.length > 0 ? group.people.map((item) => item.staff_name).join(', ') : 'No record'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
