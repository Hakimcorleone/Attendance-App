"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import LiveView from "@/components/LiveView";

const team = [
  "Zahran",
  "Sheela",
  "Nurshafiqah",
  "Syed",
  "Jeff",
  "Hakim",
  "Azam",
  "Azizah",
  "Natasha",
];

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const leaveTypes = ["AL", "MC", "EL", "RL", "PL", "ML", "HL", "CL", "Others"];

const avatarMap: Record<string, string> = {
  Zahran: "/avatars/zahran.png",
  Sheela: "/avatars/sheela.png",
  Nurshafiqah: "/avatars/nurshafiqah.png",
  Syed: "/avatars/syed.png",
  Jeff: "/avatars/jeff.png",
  Hakim: "/avatars/hakim.png",
  Azam: "/avatars/azam.png",
  Azizah: "/avatars/azizah.png",
  Natasha: "/avatars/natasha.png",
};

const adminPassword = "1234";

type TabKey = "dashboard" | "daily" | "wfh";
type DashboardView = "live" | "list";

const dashboardViewKey = "attendance-dashboard-view";

type LeaveRecord = {
  id?: string;
  attendance_date: string;
  name: string;
  leave_type: string;
  note: string | null;
};

type WfhRecord = {
  id?: string;
  name: string;
  day: string;
};

type LeaveRange = {
  startDate: string;
  endDate: string;
};

function formatDateValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayDate() {
  return formatDateValue(new Date());
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

function offsetDateValue(dateString: string, offset: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return formatDateValue(date);
}

function formatDisplayDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLeaveRange(range: LeaveRange) {
  if (range.startDate === range.endDate) {
    return formatDisplayDate(range.startDate);
  }

  return `${formatDisplayDate(range.startDate)} - ${formatDisplayDate(range.endDate)}`;
}

function getLeaveRecordKey(record: LeaveRecord) {
  return [
    record.attendance_date,
    record.name,
    record.leave_type,
    record.note?.trim() || "",
  ].join("::");
}

function getConsecutiveLeaveRange(record: LeaveRecord, records: LeaveRecord[]): LeaveRange {
  const matchingDates = new Set(
    records
      .filter(
        (item) =>
          item.name === record.name &&
          item.leave_type === record.leave_type &&
          (item.note?.trim() || "") === (record.note?.trim() || "")
      )
      .map((item) => item.attendance_date)
  );

  let startDate = record.attendance_date;
  let endDate = record.attendance_date;
  let previousDate = offsetDateValue(record.attendance_date, -1);
  let nextDate = offsetDateValue(record.attendance_date, 1);

  while (matchingDates.has(previousDate)) {
    startDate = previousDate;
    previousDate = offsetDateValue(previousDate, -1);
  }

  while (matchingDates.has(nextDate)) {
    endDate = nextDate;
    nextDate = offsetDateValue(nextDate, 1);
  }

  return { startDate, endDate };
}

export default function AttendanceDashboard() {
  const [selectedUser, setSelectedUser] = useState("");
  const [adminInput, setAdminInput] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");

  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [allLeaveRecords, setAllLeaveRecords] = useState<LeaveRecord[]>([]);
  const [wfhRecords, setWfhRecords] = useState<WfhRecord[]>([]);

  const [leaveType, setLeaveType] = useState("");
  const [leaveNote, setLeaveNote] = useState("");
  const [leaveIsHalfDay, setLeaveIsHalfDay] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(getTodayDate());
  const [leaveEndDate, setLeaveEndDate] = useState(getTodayDate());
  const [adminSelectedName, setAdminSelectedName] = useState("");

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("live");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(dashboardViewKey);
      if (saved === "live" || saved === "list") setDashboardView(saved);
    } catch {
      // Storage can be blocked (private mode); the default view is fine.
    }
  }, []);

  const changeDashboardView = (view: DashboardView) => {
    setDashboardView(view);
    try {
      localStorage.setItem(dashboardViewKey, view);
    } catch {
      // Ignore storage failures; the choice just won't be remembered.
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDate = getTodayDate();
  const todayDay = now.toLocaleDateString("en-US", { weekday: "long" });
  const displayDate = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const displayTime = now.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const isAdmin = selectedUser === "Admin" && adminUnlocked;
  const enteredApp =
    selectedUser !== "" && (selectedUser !== "Admin" || adminUnlocked);

  const fetchData = async () => {
    setLoading(true);

    const { data: dailyData, error: dailyError } = await supabase
      .from("daily_attendance")
      .select("*")
      .order("attendance_date", { ascending: true })
      .order("name", { ascending: true });

    const { data: wfhData, error: wfhError } = await supabase
      .from("wfh_schedule")
      .select("*");

    if (dailyError) {
      console.error("FETCH DAILY ERROR:", dailyError);
    } else {
      const records = (dailyData || []) as LeaveRecord[];
      setAllLeaveRecords(records);
      setLeaveRecords(records.filter((record) => record.attendance_date === todayDate));
    }

    if (wfhError) {
      console.error("FETCH WFH ERROR:", wfhError);
    } else {
      setWfhRecords((wfhData || []) as WfhRecord[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("attendance-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_attendance" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wfh_schedule" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [todayDate]);

  const wfhMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    wfhRecords.forEach((record) => {
      if (!map[record.name]) map[record.name] = [];
      map[record.name].push(record.day);
    });
    return map;
  }, [wfhRecords]);

  const leaveToday = leaveRecords;

  const leaveRangeMap = useMemo(() => {
    const map: Record<string, LeaveRange> = {};
    leaveToday.forEach((record) => {
      map[getLeaveRecordKey(record)] = getConsecutiveLeaveRange(record, allLeaveRecords);
    });
    return map;
  }, [leaveToday, allLeaveRecords]);

  // Leave takes priority over a recurring WFH day.
  const wfhToday = useMemo(
    () =>
      team.filter(
        (name) =>
          (wfhMap[name] || []).includes(todayDay) &&
          !leaveToday.some((record) => record.name === name)
      ),
    [wfhMap, todayDay, leaveToday]
  );

  const inOfficeToday = useMemo(
    () =>
      team.filter(
        (name) =>
          !wfhToday.includes(name) &&
          !leaveToday.some((record) => record.name === name)
      ),
    [wfhToday, leaveToday]
  );

  const leaveDateRange = useMemo(
    () => getDateRange(leaveStartDate, leaveEndDate),
    [leaveStartDate, leaveEndDate]
  );

  const handleAdminLogin = () => {
    if (adminInput === adminPassword) {
      setAdminUnlocked(true);
      setTab("dashboard");
    } else {
      alert("Wrong admin password");
    }
  };

  const handleLogout = () => {
    setSelectedUser("");
    setAdminInput("");
    setAdminUnlocked(false);
    setTab("dashboard");
    setLeaveType("");
    setLeaveNote("");
    setLeaveIsHalfDay(false);
    setLeaveStartDate(todayDate);
    setLeaveEndDate(todayDate);
    setAdminSelectedName("");
  };

  const handleSaveLeave = async () => {
    const targetName = isAdmin ? adminSelectedName : selectedUser;

    if (!targetName || !leaveType) {
      alert("Please select name and leave type");
      return;
    }

    if (leaveDateRange.length === 0) {
      alert("Please select a valid date range");
      return;
    }

    const trimmedLeaveNote = leaveNote.trim();
    const savedNote = [leaveIsHalfDay ? "Half day" : "", trimmedLeaveNote]
      .filter(Boolean)
      .join(" - ");

    const records = leaveDateRange.map((attendanceDate) => ({
      attendance_date: attendanceDate,
      name: targetName,
      leave_type: leaveType,
      note: savedNote || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("daily_attendance").upsert(
      records,
      {
        onConflict: "attendance_date,name",
      }
    );

    if (error) {
      console.error("SAVE LEAVE ERROR:", error);
      alert("Save failed: " + error.message);
      return;
    }

    alert(
      leaveDateRange.length === 1
        ? "Leave saved!"
        : `Leave saved for ${leaveDateRange.length} days!`
    );
    setLeaveType("");
    setLeaveNote("");
    setLeaveIsHalfDay(false);
    setLeaveStartDate(todayDate);
    setLeaveEndDate(todayDate);
    setAdminSelectedName("");
    fetchData();
  };

  const handleClearLeave = async (name: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("daily_attendance")
      .delete()
      .eq("attendance_date", todayDate)
      .eq("name", name);

    if (error) {
      alert("Clear failed: " + error.message);
      return;
    }

    fetchData();
  };

  const toggleWfh = async (name: string, day: string) => {
    if (!isAdmin) return;

    const current = wfhMap[name] || [];
    const exists = current.includes(day);

    if (exists) {
      const { error } = await supabase
        .from("wfh_schedule")
        .delete()
        .eq("name", name)
        .eq("day", day);

      if (error) {
        alert("WFH delete failed: " + error.message);
        return;
      }

      fetchData();
      return;
    }

    if (current.length >= 2) {
      alert("Maximum 2 WFH days only.");
      return;
    }

    const { error } = await supabase.from("wfh_schedule").insert({
      name,
      day,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert("WFH save failed: " + error.message);
      return;
    }

    fetchData();
  };

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Selamat pagi" : hour < 15 ? "Selamat tengah hari" : hour < 19 ? "Selamat petang" : "Selamat malam";
  const inOfficePercent = team.length ? Math.round((inOfficeToday.length / team.length) * 100) : 0;

  if (!enteredApp) {
    return (
      <>
        <div className="portal-shell">
          <div className="portal-glow" />
          <div className="portal-card">
            <div className="brand-mark">
              <Icon name="shield" size={22} />
            </div>
            <h1 className="portal-title">Governance Division Tracker</h1>
            <p className="portal-subtitle">
              {selectedUser === "Admin" ? "Masukkan password admin." : "Pilih nama anda untuk masuk."}
            </p>

            {selectedUser === "Admin" ? (
              <div className="admin-login">
                <div className="field">
                  <label>Admin password</label>
                  <input
                    type="password"
                    autoFocus
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdminLogin();
                    }}
                    placeholder="Enter password"
                  />
                </div>
                <button className="primary-btn full-btn" onClick={handleAdminLogin}>
                  Enter Admin
                </button>
                <button
                  className="ghost-btn full-btn"
                  onClick={() => {
                    setSelectedUser("");
                    setAdminInput("");
                  }}
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="name-grid">
                {team.map((name) => (
                  <button key={name} className="name-tile" onClick={() => setSelectedUser(name)}>
                    <Avatar name={name} size={52} />
                    <span>{name}</span>
                  </button>
                ))}
                <button className="name-tile admin-tile" onClick={() => setSelectedUser("Admin")}>
                  <span className="admin-icon">
                    <Icon name="shield" size={22} />
                  </span>
                  <span>Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <Styles />
      </>
    );
  }

  return (
    <>
      <div className="app-shell">
        <header className="hero">
          <div className="hero-main">
            <div className="hero-eyebrow">Governance Division Tracker</div>
            <h1 className="hero-title">
              {greeting}, {selectedUser}
            </h1>
            <p className="hero-subtitle">
              Daily leave status & WFH, live.
              {loading && <span className="sync-dot">Syncing…</span>}
            </p>
          </div>

          <div className="hero-side">
            <div className="clock">
              <div className="clock-time">{displayTime}</div>
              <div className="clock-date">
                {todayDay}, {displayDate}
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <Icon name="logout" size={16} />
              Logout
            </button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card tone-rose">
            <div className="stat-icon">
              <Icon name="leave" />
            </div>
            <div>
              <div className="stat-label">On Leave</div>
              <div className="stat-value">{leaveToday.length}</div>
            </div>
          </div>
          <div className="stat-card tone-violet">
            <div className="stat-icon">
              <Icon name="home" />
            </div>
            <div>
              <div className="stat-label">WFH Today</div>
              <div className="stat-value">{wfhToday.length}</div>
            </div>
          </div>
          <div className="stat-card tone-green">
            <div className="stat-icon">
              <Icon name="office" />
            </div>
            <div className="stat-grow">
              <div className="stat-label">In Office</div>
              <div className="stat-value">
                {inOfficeToday.length}
                <span className="stat-of">/ {team.length}</span>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${inOfficePercent}%` }} />
              </div>
            </div>
          </div>
          <div className="stat-card tone-blue">
            <div className="stat-icon">
              <Icon name="team" />
            </div>
            <div>
              <div className="stat-label">Team Size</div>
              <div className="stat-value">{team.length}</div>
            </div>
          </div>
        </div>

        <nav className="tabs">
          <button
            className={tab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setTab("dashboard")}
          >
            <Icon name="grid" size={16} />
            Dashboard
          </button>
          <button
            className={tab === "daily" ? "tab active" : "tab"}
            onClick={() => setTab("daily")}
          >
            <Icon name="edit" size={16} />
            Daily Update
          </button>
          <button
            className={tab === "wfh" ? "tab active" : "tab"}
            onClick={() => setTab("wfh")}
          >
            <Icon name="home" size={16} />
            WFH Summary
          </button>
        </nav>

        {tab === "dashboard" && (
          <div className="view-switch">
            <button
              className={dashboardView === "live" ? "view-btn active" : "view-btn"}
              onClick={() => changeDashboardView("live")}
            >
              🎮 Live View
            </button>
            <button
              className={dashboardView === "list" ? "view-btn active" : "view-btn"}
              onClick={() => changeDashboardView("list")}
            >
              <Icon name="grid" size={15} />
              List
            </button>
          </div>
        )}

        {tab === "dashboard" && dashboardView === "live" && (
          <LiveView
            inOffice={inOfficeToday}
            wfh={wfhToday}
            leave={leaveToday}
            hour={hour}
          />
        )}

        {tab === "dashboard" && dashboardView === "list" && (
          <div className="dashboard-grid">
            <section className="panel tone-rose">
              <div className="panel-head">
                <h2>On Leave Today</h2>
                <span className="count-badge">{leaveToday.length}</span>
              </div>
              <div className="panel-list">
                {leaveToday.length === 0 && <EmptyState text="No leave today." />}
                {leaveToday.map((record) => {
                  const range = leaveRangeMap[getLeaveRecordKey(record)] || {
                    startDate: record.attendance_date,
                    endDate: record.attendance_date,
                  };

                  return (
                    <div key={record.name} className="person-card">
                      <Avatar name={record.name} />
                      <div className="person-info">
                        <div className="person-name">
                          {record.name}
                          <LeaveBadge type={record.leave_type} />
                        </div>
                        {record.note && <div className="person-sub">{record.note}</div>}
                        <div className="person-meta">
                          <Icon name="calendar" size={13} />
                          {formatLeaveRange(range)}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          className="small-danger-btn"
                          onClick={() => handleClearLeave(record.name)}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel tone-violet">
              <div className="panel-head">
                <h2>WFH Today</h2>
                <span className="count-badge">{wfhToday.length}</span>
              </div>
              <div className="panel-list">
                {wfhToday.length === 0 && <EmptyState text="No WFH today." />}
                {wfhToday.map((name) => (
                  <div key={name} className="person-card">
                    <Avatar name={name} />
                    <div className="person-info">
                      <div className="person-name">{name}</div>
                      <div className="person-meta">
                        <Icon name="home" size={13} />
                        {(wfhMap[name] || []).join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel tone-green">
              <div className="panel-head">
                <h2>In Office Today</h2>
                <span className="count-badge">{inOfficeToday.length}</span>
              </div>
              <div className="panel-list">
                {inOfficeToday.length === 0 && <EmptyState text="Nobody in office today." />}
                {inOfficeToday.map((name) => (
                  <div key={name} className="person-card">
                    <Avatar name={name} />
                    <div className="person-info">
                      <div className="person-name">{name}</div>
                      <div className="person-meta">
                        <span className="live-dot" />
                        Available in office
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "daily" && (
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <h2>Daily Leave Update</h2>
                <p className="muted">
                  User biasa hanya boleh submit untuk diri sendiri. Admin boleh pilih sesiapa.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                {isAdmin ? (
                  <select
                    value={adminSelectedName}
                    onChange={(e) => setAdminSelectedName(e.target.value)}
                  >
                    <option value="">Select name</option>
                    {team.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="readonly-box">
                    <Avatar name={selectedUser} size={28} />
                    {selectedUser}
                  </div>
                )}
              </div>

              <div className="field">
                <label>Start Date</label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLeaveStartDate(value);
                    if (leaveEndDate < value) setLeaveEndDate(value);
                  }}
                />
              </div>

              <div className="field">
                <label>End Date</label>
                <input
                  type="date"
                  value={leaveEndDate}
                  min={leaveStartDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                />
              </div>

              <div className="field field-wide">
                <label>Leave Type</label>
                <div className="chip-row">
                  {leaveTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={leaveType === type ? "type-chip active" : "type-chip"}
                      style={{ "--chip": getLeaveColor(type) } as CSSProperties}
                      onClick={() => setLeaveType(leaveType === type ? "" : type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Duration</label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={leaveIsHalfDay}
                    onChange={(e) => setLeaveIsHalfDay(e.target.checked)}
                  />
                  <span>Half day</span>
                </label>
              </div>

              <div className="field field-span-2">
                <label>Note</label>
                <input
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Reason / note"
                />
              </div>
            </div>

            <div className="form-footer">
              <p className="muted small">
                <Icon name="calendar" size={14} />
                {leaveDateRange.length <= 1
                  ? "This record will be saved for 1 day."
                  : `This record will be saved for ${leaveDateRange.length} days.`}
              </p>
              <button className="primary-btn" onClick={handleSaveLeave}>
                <Icon name="check" size={16} />
                Save Leave Record
              </button>
            </div>
          </section>
        )}

        {tab === "wfh" && (
          <div className="stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Weekly WFH Summary</h2>
                  <p className="muted">Semua orang boleh view. Hanya Admin boleh edit.</p>
                </div>
              </div>

              <div className="wfh-grid">
                {weekdays.map((day) => {
                  const people = team.filter((name) => (wfhMap[name] || []).includes(day));

                  return (
                    <div key={day} className={day === todayDay ? "day-card today" : "day-card"}>
                      <div className="day-title">
                        {day}
                        {day === todayDay ? (
                          <span className="today-tag">Today</span>
                        ) : (
                          <span className="day-count">{people.length}</span>
                        )}
                      </div>

                      <div className="day-list">
                        {people.length === 0 ? (
                          <p className="muted small">No WFH</p>
                        ) : (
                          people.map((name) => (
                            <div key={name} className="person-row">
                              <Avatar name={name} size={32} />
                              <span>{name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {isAdmin && (
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Admin WFH Setup</h2>
                    <p className="muted">Maximum 2 hari untuk setiap orang.</p>
                  </div>
                </div>

                <div className="admin-list">
                  {team.map((name) => {
                    const days = wfhMap[name] || [];

                    return (
                      <div key={name} className="admin-row">
                        <div className="admin-person">
                          <Avatar name={name} size={38} />
                          <div>
                            <div className="person-name">{name}</div>
                            <div className="person-sub">{days.length}/2 days</div>
                          </div>
                        </div>

                        <div className="day-buttons">
                          {weekdays.map((day) => (
                            <button
                              key={day}
                              className={days.includes(day) ? "mini-btn active" : "mini-btn"}
                              onClick={() => toggleWfh(name, day)}
                              title={day}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Styles />
    </>
  );
}

const leaveColors: Record<string, string> = {
  AL: "#2563eb",
  MC: "#e11d48",
  EL: "#d97706",
  RL: "#0d9488",
  PL: "#7c3aed",
  ML: "#db2777",
  HL: "#ea580c",
  CL: "#0891b2",
  Others: "#475569",
};

function getLeaveColor(type: string) {
  return leaveColors[type] || leaveColors.Others;
}

function LeaveBadge({ type }: { type: string }) {
  return (
    <span className="leave-badge" style={{ "--chip": getLeaveColor(type) } as CSSProperties}>
      {type}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Icon name="check" size={18} />
      {text}
    </div>
  );
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (broken || !avatarMap[name]) {
    return (
      <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.32 }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      className="avatar"
      src={avatarMap[name]}
      alt={name}
      onError={() => setBroken(true)}
      style={{ width: size, height: size }}
    />
  );
}

const iconPaths: Record<string, ReactNode> = {
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />,
  leave: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18M10 14l4 4M14 14l-4 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z" />,
  office: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" />,
  logout: <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {iconPaths[name]}
    </svg>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      :root {
        --ink: #0b1630;
        --ink-soft: #334155;
        --muted: #64748b;
        --line: #e3e9f3;
        --surface: #ffffff;
        --canvas: #f2f5fb;
        --brand: #1d4ed8;
        --brand-deep: #0b1b4a;
        --rose: #e11d48;
        --violet: #7c3aed;
        --green: #059669;
        --blue: #2563eb;
      }

      html {
        background: var(--canvas);
      }

      body {
        margin: 0;
        font-family: var(--font-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
        background: var(--canvas);
        color: var(--ink);
        -webkit-font-smoothing: antialiased;
      }

      button,
      input,
      select {
        font: inherit;
      }

      button {
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease,
          transform 0.15s ease, box-shadow 0.15s ease;
      }

      /* ---------- Portal ---------- */

      .portal-shell {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        overflow: hidden;
        background: radial-gradient(circle at 20% 10%, #1e3a8a 0%, transparent 45%),
          radial-gradient(circle at 85% 90%, #4c1d95 0%, transparent 40%),
          linear-gradient(160deg, #071029 0%, #0b1b4a 60%, #0a1433 100%);
      }

      .portal-glow {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
        background-size: 22px 22px;
        pointer-events: none;
      }

      .portal-card {
        position: relative;
        width: 100%;
        max-width: 560px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 40px 80px rgba(2, 6, 23, 0.45);
      }

      .brand-mark {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
        margin-bottom: 18px;
      }

      .portal-title {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--ink);
      }

      .portal-subtitle {
        margin: 8px 0 22px;
        color: var(--muted);
      }

      .name-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
        gap: 10px;
      }

      .name-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 14px 8px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #f8faff;
        color: var(--ink);
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
      }

      .name-tile:hover {
        border-color: #bfd0f5;
        background: white;
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(29, 78, 216, 0.12);
      }

      .admin-tile {
        background: var(--brand-deep);
        border-color: var(--brand-deep);
        color: white;
      }

      .admin-tile:hover {
        background: #13286b;
        border-color: #13286b;
      }

      .admin-icon {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.12);
      }

      .admin-login {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      /* ---------- Shell & hero ---------- */

      .app-shell {
        max-width: 1320px;
        margin: 0 auto;
        padding: 24px;
      }

      .hero {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        padding: 28px 32px;
        margin-bottom: 18px;
        border-radius: 28px;
        color: white;
        overflow: hidden;
        background: radial-gradient(circle at 90% 0%, rgba(124, 58, 237, 0.55) 0%, transparent 45%),
          linear-gradient(135deg, #0b1b4a 0%, #1d4ed8 100%);
        box-shadow: 0 24px 48px rgba(11, 27, 74, 0.25);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
      }

      .hero-main,
      .hero-side {
        position: relative;
        z-index: 1;
      }

      .hero-eyebrow {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #a5b8f3;
      }

      .hero-title {
        margin: 8px 0 0;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .hero-subtitle {
        margin: 6px 0 0;
        color: #c7d4f7;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sync-dot {
        font-size: 12px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .hero-side {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .clock {
        text-align: right;
        padding: 12px 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(6px);
      }

      .clock-time {
        font-size: 24px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }

      .clock-date {
        font-size: 13px;
        color: #c7d4f7;
        margin-top: 2px;
      }

      .logout-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.08);
        color: white;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .logout-btn:hover {
        background: #e11d48;
        border-color: #e11d48;
      }

      /* ---------- Stats ---------- */

      .tone-rose { --tone: var(--rose); --tone-soft: #fff1f3; }
      .tone-violet { --tone: var(--violet); --tone-soft: #f4efff; }
      .tone-green { --tone: var(--green); --tone-soft: #ecfdf5; }
      .tone-blue { --tone: var(--blue); --tone-soft: #eef4ff; }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 18px;
      }

      .stat-card,
      .panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.05);
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
      }

      .stat-icon {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: var(--tone);
        background: var(--tone-soft);
        flex-shrink: 0;
      }

      .stat-grow {
        flex: 1;
      }

      .stat-label {
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .stat-value {
        margin-top: 2px;
        font-size: 34px;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--ink);
      }

      .stat-of {
        font-size: 16px;
        font-weight: 700;
        color: var(--muted);
        margin-left: 4px;
      }

      .meter {
        height: 6px;
        border-radius: 999px;
        background: #e6f4ee;
        margin-top: 8px;
        overflow: hidden;
      }

      .meter-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #10b981, #059669);
        transition: width 0.4s ease;
      }

      /* ---------- Tabs ---------- */

      .tabs {
        display: flex;
        gap: 6px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 6px;
        margin-bottom: 18px;
      }

      .tab {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        background: transparent;
        color: var(--muted);
        padding: 12px 16px;
        border-radius: 13px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }

      .tab:hover {
        background: #f1f5fd;
        color: var(--ink);
      }

      .tab.active {
        background: var(--brand-deep);
        color: white;
        box-shadow: 0 8px 18px rgba(11, 27, 74, 0.25);
      }

      /* ---------- Dashboard view switch ---------- */

      .view-switch {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        margin-bottom: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 14px;
      }

      .view-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--muted);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .view-btn:hover {
        color: var(--ink);
      }

      .view-btn.active {
        background: #eef4ff;
        color: var(--brand);
      }

      /* ---------- Panels ---------- */

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        align-items: start;
      }

      .panel {
        padding: 20px;
      }

      .panel.tone-rose,
      .panel.tone-violet,
      .panel.tone-green {
        border-top: 4px solid var(--tone);
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .panel h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: var(--ink);
      }

      .panel-head .muted {
        margin: 6px 0 0;
      }

      .count-badge {
        min-width: 30px;
        height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 800;
        color: var(--tone);
        background: var(--tone-soft);
      }

      .muted {
        color: var(--muted);
      }

      .small {
        font-size: 14px;
      }

      .panel-list,
      .admin-list,
      .stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .stack {
        gap: 14px;
      }

      .person-card,
      .person-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .person-card {
        padding: 12px;
        border-radius: 16px;
        border: 1px solid #edf1f8;
        background: #fafcff;
      }

      .person-card:hover {
        border-color: #dbe4f3;
        background: white;
      }

      .person-info {
        min-width: 0;
      }

      .person-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        color: var(--ink);
      }

      .person-sub {
        margin-top: 3px;
        color: var(--ink-soft);
        font-size: 14px;
      }

      .person-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }

      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
      }

      .leave-badge {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 3px 8px;
        border-radius: 999px;
        color: var(--chip);
        background: color-mix(in srgb, var(--chip) 12%, white);
        border: 1px solid color-mix(in srgb, var(--chip) 25%, white);
      }

      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 22px;
        border-radius: 16px;
        border: 1px dashed #d6dfee;
        color: var(--muted);
        font-weight: 600;
      }

      .avatar {
        border-radius: 14px;
        object-fit: cover;
        background: white;
        border: 2px solid white;
        box-shadow: 0 0 0 1px #dbe4f3, 0 4px 10px rgba(15, 23, 42, 0.08);
        flex-shrink: 0;
      }

      .avatar-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: var(--brand);
        background: #e8efff;
      }

      .small-danger-btn {
        margin-left: auto;
        border: 1px solid #fecdd3;
        background: #fff1f2;
        color: #be123c;
        border-radius: 999px;
        padding: 7px 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .small-danger-btn:hover {
        background: #e11d48;
        border-color: #e11d48;
        color: white;
      }

      /* ---------- Form ---------- */

      .form-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin: 6px 0 18px;
      }

      .field-wide {
        grid-column: 1 / -1;
      }

      .field-span-2 {
        grid-column: span 2;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .field label {
        font-size: 13px;
        font-weight: 700;
        color: var(--ink-soft);
      }

      .field input,
      .field select {
        width: 100%;
        min-height: 46px;
        padding: 11px 14px;
        border-radius: 14px;
        border: 1px solid #d9e2f0;
        background: white;
        color: var(--ink);
        outline: none;
      }

      .field input:focus,
      .field select:focus {
        border-color: var(--brand);
        box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .type-chip {
        min-width: 64px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--chip) 25%, white);
        background: color-mix(in srgb, var(--chip) 7%, white);
        color: var(--chip);
        font-weight: 800;
        cursor: pointer;
      }

      .type-chip:hover {
        transform: translateY(-1px);
      }

      .type-chip.active {
        background: var(--chip);
        border-color: var(--chip);
        color: white;
        box-shadow: 0 8px 18px color-mix(in srgb, var(--chip) 35%, transparent);
      }

      .checkbox-row {
        min-height: 46px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 14px;
        border-radius: 14px;
        border: 1px solid #d9e2f0;
        background: white;
        color: var(--ink-soft);
        cursor: pointer;
      }

      .field .checkbox-row input {
        width: 18px;
        min-height: 0;
        height: 18px;
        margin: 0;
        padding: 0;
        accent-color: var(--brand);
        flex-shrink: 0;
      }

      .checkbox-row span {
        font-size: 14px;
        font-weight: 700;
      }

      .readonly-box {
        min-height: 46px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 14px;
        border: 1px solid #d9e2f0;
        background: #f6f9ff;
        color: var(--ink);
        font-weight: 700;
      }

      .readonly-box .avatar {
        border-radius: 9px;
      }

      .form-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }

      .form-footer p {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }

      .primary-btn,
      .ghost-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 13px 20px;
        border-radius: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .primary-btn {
        border: 0;
        color: white;
        background: linear-gradient(135deg, #1d4ed8, #4338ca);
        box-shadow: 0 10px 22px rgba(29, 78, 216, 0.28);
      }

      .primary-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 28px rgba(29, 78, 216, 0.34);
      }

      .ghost-btn {
        border: 1px solid var(--line);
        background: white;
        color: var(--ink-soft);
      }

      .ghost-btn:hover {
        background: #f6f9ff;
      }

      .full-btn {
        width: 100%;
        margin-top: 10px;
      }

      /* ---------- WFH ---------- */

      .wfh-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
      }

      .day-card {
        padding: 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #fafcff;
      }

      .day-card.today {
        border-color: #c4b5fd;
        background: #faf7ff;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
      }

      .day-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 15px;
        font-weight: 800;
        color: var(--ink);
        margin-bottom: 12px;
      }

      .day-count {
        font-size: 12px;
        font-weight: 800;
        color: var(--muted);
        background: #eef2f9;
        padding: 2px 9px;
        border-radius: 999px;
      }

      .today-tag {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: white;
        background: var(--violet);
        padding: 3px 9px;
        border-radius: 999px;
      }

      .day-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .day-list .muted {
        margin: 0;
      }

      .person-row {
        font-weight: 600;
        font-size: 14px;
      }

      .person-row .avatar {
        border-radius: 10px;
      }

      .admin-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid #edf1f8;
        background: #fafcff;
      }

      .admin-person {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .admin-person .person-sub {
        font-size: 13px;
        color: var(--muted);
      }

      .day-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .mini-btn {
        min-width: 56px;
        border: 1px solid #d9e2f0;
        background: white;
        color: var(--ink-soft);
        padding: 9px 10px;
        border-radius: 11px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .mini-btn:hover {
        border-color: #c4b5fd;
        color: var(--violet);
      }

      .mini-btn.active {
        background: var(--violet);
        color: white;
        border-color: var(--violet);
      }

      /* ---------- Responsive ---------- */

      @media (max-width: 1100px) {
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .dashboard-grid,
        .wfh-grid {
          grid-template-columns: 1fr;
        }

        .form-grid {
          grid-template-columns: 1fr 1fr;
        }

        .field-span-2 {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 720px) {
        .app-shell {
          padding: 16px;
        }

        .hero {
          flex-direction: column;
          align-items: stretch;
          padding: 22px;
          border-radius: 22px;
        }

        .hero-title {
          font-size: 26px;
        }

        .hero-side {
          justify-content: space-between;
        }

        .clock {
          text-align: left;
        }

        .stats-grid {
          gap: 10px;
        }

        .stat-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 16px;
        }

        .stat-grow {
          width: 100%;
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
        }

        .stat-value {
          font-size: 28px;
        }

        .tab {
          min-width: 0;
          padding: 11px 6px;
          font-size: 13px;
        }

        .tab svg {
          display: none;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-footer {
          flex-direction: column;
          align-items: stretch;
        }

        .admin-row {
          flex-direction: column;
          align-items: stretch;
        }

        .day-buttons .mini-btn {
          flex: 1;
          min-width: 0;
        }

        .portal-card {
          padding: 24px 18px;
          border-radius: 24px;
        }

        .name-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `}</style>
  );
}
