"use client";

import { useMemo, useState } from "react";

const team = [
  "Zahran",
  "Sheela",
  "Nurshafiqah",
  "Danish",
  "Syed",
  "Tamil",
  "Jeff",
  "Hakim",
  "Razif",
  "Amal",
];

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const leaveTypes = ["AL", "MC", "EL", "RL", "PL", "ML", "HL", "CL", "Others"];

const avatarMap: Record<string, string> = {
  Zahran: "/avatars/zahran.png",
  Sheela: "/avatars/sheela.png",
  Nurshafiqah: "/avatars/nurshafiqah.png",
  Danish: "/avatars/danish.png",
  Syed: "/avatars/syed.png",
  Tamil: "/avatars/tamil.png",
  Jeff: "/avatars/jeff.png",
  Hakim: "/avatars/hakim.png",
  Razif: "/avatars/razif.png",
  Amal: "/avatars/amal.png",
};

const adminPassword = "1234";

type TabKey = "dashboard" | "daily" | "wfh";

type LeaveRecord = {
  name: string;
  leaveType: string;
  note: string;
  date: string;
};

export default function AttendanceDashboard() {
  const [selectedUser, setSelectedUser] = useState("");
  const [adminInput, setAdminInput] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");

  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [leaveType, setLeaveType] = useState("");
  const [leaveNote, setLeaveNote] = useState("");
  const [adminSelectedName, setAdminSelectedName] = useState("");

  // kosong masa mula
  const [wfhMap, setWfhMap] = useState<Record<string, string[]>>({});

  const displayDate = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  });

  const isAdmin = selectedUser === "Admin" && adminUnlocked;
  const enteredApp = selectedUser !== "" && (selectedUser !== "Admin" || adminUnlocked);

  const leaveToday = useMemo(
    () => leaveRecords.filter((r) => r.date === todayDate),
    [leaveRecords, todayDate]
  );

  const wfhToday = useMemo(
    () => team.filter((name) => (wfhMap[name] || []).includes(todayDay)),
    [wfhMap, todayDay]
  );

  const inOfficeToday = useMemo(
    () =>
      team.filter(
        (name) =>
          !wfhToday.includes(name) && !leaveToday.some((record) => record.name === name)
      ),
    [wfhToday, leaveToday]
  );

  const handleAdminLogin = () => {
    if (adminInput === adminPassword) {
      setAdminUnlocked(true);
      setTab("dashboard");
    }
  };

  const handleLogout = () => {
    setSelectedUser("");
    setAdminInput("");
    setAdminUnlocked(false);
    setTab("dashboard");
    setLeaveType("");
    setLeaveNote("");
    setAdminSelectedName("");
  };

  const handleSaveLeave = () => {
    const targetName = isAdmin ? adminSelectedName : selectedUser;
    if (!targetName || !leaveType) return;

    setLeaveRecords((prev) => [
      ...prev.filter((r) => !(r.name === targetName && r.date === todayDate)),
      {
        name: targetName,
        leaveType,
        note: leaveNote,
        date: todayDate,
      },
    ]);

    setLeaveType("");
    setLeaveNote("");
  };

  const toggleWfh = (name: string, day: string) => {
    if (!isAdmin) return;

    const current = wfhMap[name] || [];
    const exists = current.includes(day);

    if (exists) {
      setWfhMap({
        ...wfhMap,
        [name]: current.filter((d) => d !== day),
      });
      return;
    }

    if (current.length >= 2) return;

    setWfhMap({
      ...wfhMap,
      [name]: [...current, day],
    });
  };

  const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => {
    const [broken, setBroken] = useState(false);

    if (broken || !avatarMap[name]) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 12,
            border: "1px solid #d9e2f2",
            background: "#eef3fb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            color: "#334155",
            flexShrink: 0,
          }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      );
    }

    return (
      <img
        src={avatarMap[name]}
        alt={name}
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          objectFit: "cover",
          border: "1px solid #d9e2f2",
          background: "#fff",
          flexShrink: 0,
        }}
      />
    );
  };

  if (!enteredApp) {
    return (
      <>
        <div className="portal-shell">
          <div className="portal-card">
            <h1 className="portal-title">Attendance + WFH Portal</h1>
            <p className="portal-subtitle">
              Pilih nama dahulu. Admin perlu masukkan password.
            </p>

            <div className="field">
              <label>Pilih nama</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">Select</option>
                <option value="Admin">Admin</option>
                {team.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser === "Admin" && (
              <div className="field">
                <label>Admin password</label>
                <input
                  type="password"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="Enter password"
                />
                <button className="primary-btn full-btn" onClick={handleAdminLogin}>
                  Enter Admin
                </button>
              </div>
            )}

            {selectedUser && selectedUser !== "Admin" && (
              <button className="primary-btn full-btn" onClick={() => setTab("dashboard")}>
                Enter
              </button>
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
        <div className="topbar">
          <div>
            <h1 className="main-title">Attendance + WFH Dashboard</h1>
            <p className="main-subtitle">
              Summary harian untuk team. Admin sahaja boleh setup WFH.
            </p>
          </div>

          <div className="topbar-badges">
            <div className="pill">{selectedUser}</div>
            <div className="pill">{todayDay}, {displayDate}</div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Leave</div>
            <div className="stat-value">{leaveToday.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">WFH Today</div>
            <div className="stat-value">{wfhToday.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Office</div>
            <div className="stat-value">{inOfficeToday.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Team Size</div>
            <div className="stat-value">{team.length}</div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={tab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={tab === "daily" ? "tab active" : "tab"}
            onClick={() => setTab("daily")}
          >
            Daily Update
          </button>
          <button
            className={tab === "wfh" ? "tab active" : "tab"}
            onClick={() => setTab("wfh")}
          >
            WFH Summary
          </button>
        </div>

        {tab === "dashboard" && (
          <div className="dashboard-grid">
            <div className="panel">
              <h2>On Leave Today</h2>
              <div className="panel-list">
                {leaveToday.length === 0 && <p className="muted">No leave today.</p>}
                {leaveToday.map((record) => (
                  <div key={record.name} className="person-card">
                    <Avatar name={record.name} />
                    <div>
                      <div className="person-name">{record.name}</div>
                      <div className="person-sub">
                        {record.leaveType}
                        {record.note ? ` · ${record.note}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>WFH Today</h2>
              <div className="panel-list">
                {wfhToday.length === 0 && <p className="muted">No WFH today.</p>}
                {wfhToday.map((name) => (
                  <div key={name} className="person-card">
                    <Avatar name={name} />
                    <div>
                      <div className="person-name">{name}</div>
                      <div className="person-sub">{(wfhMap[name] || []).join(", ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>In Office Today</h2>
              <div className="panel-list">
                {inOfficeToday.map((name) => (
                  <div key={name} className="person-card">
                    <Avatar name={name} />
                    <div>
                      <div className="person-name">{name}</div>
                      <div className="person-sub">Available in office</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "daily" && (
          <div className="panel">
            <h2>Daily Leave Update</h2>
            <p className="muted">
              User biasa hanya boleh submit untuk diri sendiri. Admin boleh pilih sesiapa.
            </p>

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
                  <div className="readonly-box">{selectedUser}</div>
                )}
              </div>

              <div className="field">
                <label>Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Note</label>
                <input
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Reason / note"
                />
              </div>
            </div>

            <button className="primary-btn" onClick={handleSaveLeave}>
              Save Leave Record
            </button>
          </div>
        )}

        {tab === "wfh" && (
          <div className="stack">
            <div className="panel">
              <h2>Weekly WFH Summary</h2>
              <p className="muted">Semua orang boleh view. Hanya Admin boleh edit.</p>

              <div className="wfh-grid">
                {weekdays.map((day) => (
                  <div key={day} className="day-card">
                    <div className="day-title">{day}</div>

                    <div className="day-list">
                      {team.filter((name) => (wfhMap[name] || []).includes(day)).length === 0 ? (
                        <p className="muted small">No WFH</p>
                      ) : (
                        team
                          .filter((name) => (wfhMap[name] || []).includes(day))
                          .map((name) => (
                            <div key={name} className="person-row">
                              <Avatar name={name} size={36} />
                              <span>{name}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="panel">
                <h2>Admin WFH Setup</h2>
                <p className="muted">Maximum 2 hari untuk setiap orang.</p>

                <div className="admin-list">
                  {team.map((name) => (
                    <div key={name} className="admin-card">
                      <div className="person-card">
                        <Avatar name={name} />
                        <div>
                          <div className="person-name">{name}</div>
                          <div className="person-sub">
                            Current: {(wfhMap[name] || []).join(", ") || "No WFH selected"}
                          </div>
                        </div>
                      </div>

                      <div className="day-buttons">
                        {weekdays.map((day) => (
                          <button
                            key={day}
                            className={(wfhMap[name] || []).includes(day) ? "mini-btn active" : "mini-btn"}
                            onClick={() => toggleWfh(name, day)}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Styles />
    </>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #f6f8fc;
        color: #111827;
      }

      .portal-shell {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(180deg, #f7f9fd 0%, #eef3fb 100%);
      }

      .portal-card {
        width: 100%;
        max-width: 420px;
        background: white;
        border: 1px solid #dde6f3;
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 20px 45px rgba(37, 99, 235, 0.08);
      }

      .portal-title {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        color: #0f172a;
      }

      .portal-subtitle {
        margin: 10px 0 0;
        color: #64748b;
        line-height: 1.5;
      }

      .app-shell {
        max-width: 1320px;
        margin: 0 auto;
        padding: 28px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 20px;
      }

      .main-title {
        margin: 0;
        font-size: 32px;
        font-weight: 800;
        color: #0f172a;
      }

      .main-subtitle {
        margin: 8px 0 0;
        color: #64748b;
      }

      .topbar-badges {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .pill {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid #d9e2f2;
        background: white;
        font-size: 14px;
        color: #334155;
        font-weight: 700;
      }

      .logout-btn {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #b91c1c;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 20px;
      }

      .stat-card,
      .panel,
      .day-card,
      .admin-card {
        background: white;
        border: 1px solid #dde6f3;
        border-radius: 22px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
      }

      .stat-card {
        padding: 20px;
      }

      .stat-label {
        color: #64748b;
        font-size: 14px;
      }

      .stat-value {
        margin-top: 8px;
        font-size: 40px;
        font-weight: 800;
        color: #0f172a;
      }

      .tabs {
        display: flex;
        gap: 10px;
        background: white;
        border: 1px solid #dde6f3;
        border-radius: 18px;
        padding: 8px;
        margin-bottom: 20px;
      }

      .tab {
        flex: 1;
        border: 0;
        background: #eef3fb;
        color: #334155;
        padding: 14px 18px;
        border-radius: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .tab.active {
        background: #1d4ed8;
        color: white;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .panel {
        padding: 20px;
      }

      .panel h2 {
        margin: 0 0 10px;
        font-size: 26px;
        color: #0f172a;
      }

      .muted {
        color: #64748b;
      }

      .small {
        font-size: 14px;
      }

      .panel-list,
      .admin-list,
      .stack {
        display: flex;
        flex-direction: column;
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
        border-radius: 18px;
        border: 1px solid #e7edf7;
        background: #fbfdff;
      }

      .person-name {
        font-weight: 700;
        color: #0f172a;
      }

      .person-sub {
        margin-top: 4px;
        color: #64748b;
        font-size: 14px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin: 18px 0;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .field label {
        font-size: 14px;
        font-weight: 700;
        color: #334155;
      }

      .field input,
      .field select {
        width: 100%;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid #d9e2f2;
        background: white;
        color: #0f172a;
        outline: none;
      }

      .readonly-box {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid #d9e2f2;
        background: #f8fbff;
        color: #334155;
      }

      .primary-btn,
      .full-btn {
        border: 0;
        background: #1d4ed8;
        color: white;
        padding: 12px 16px;
        border-radius: 14px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 12px;
      }

      .full-btn {
        width: 100%;
      }

      .wfh-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-top: 18px;
      }

      .day-card {
        padding: 16px;
      }

      .day-title {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 12px;
      }

      .day-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .admin-card {
        padding: 16px;
      }

      .day-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      .mini-btn {
        border: 1px solid #d9e2f2;
        background: #f8fbff;
        color: #334155;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 700;
      }

      .mini-btn.active {
        background: #1d4ed8;
        color: white;
        border-color: #1d4ed8;
      }

      @media (max-width: 1100px) {
        .stats-grid,
        .dashboard-grid,
        .form-grid,
        .wfh-grid {
          grid-template-columns: 1fr;
        }

        .topbar {
          flex-direction: column;
        }

        .tabs {
          flex-direction: column;
        }
      }
    `}</style>
  );
}
