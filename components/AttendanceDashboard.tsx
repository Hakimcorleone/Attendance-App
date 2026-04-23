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

export default function Page() {
  const [selectedUser, setSelectedUser] = useState("");
  const [adminInput, setAdminInput] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "daily" | "wfh">("dashboard");

  const [leaveRecords, setLeaveRecords] = useState<
    { name: string; leaveType: string; note: string; date: string }[]
  >([]);

  const [leaveType, setLeaveType] = useState("");
  const [leaveNote, setLeaveNote] = useState("");
  const [adminSelectedName, setAdminSelectedName] = useState("");

  const [wfhMap, setWfhMap] = useState<Record<string, string[]>>({
    Hakim: ["Thursday", "Friday"],
    Nurshafiqah: ["Monday", "Thursday"],
    Sheela: ["Tuesday"],
    Syed: ["Tuesday"],
    Razif: ["Wednesday", "Friday"],
  });

  const todayDate = new Date().toISOString().split("T")[0];
  const todayDay = new Date().toLocaleDateString("en-US", { weekday: "long" });

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
    }
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

  const Avatar = ({ name }: { name: string }) => (
    <img
      src={avatarMap[name]}
      alt={name}
      className="h-10 w-10 rounded-md border object-cover"
    />
  );

  if (!enteredApp) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-black">Attendance + WFH Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Pilih nama dahulu. Admin perlu masukkan password.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-black">Pilih nama</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
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
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-black">Admin password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                placeholder="Enter password"
              />
              <button
                onClick={handleAdminLogin}
                className="mt-3 w-full rounded-lg bg-black px-4 py-2 text-white"
              >
                Enter Admin
              </button>
            </div>
          )}

          {selectedUser && selectedUser !== "Admin" && (
            <button
              onClick={() => setTab("dashboard")}
              className="mt-4 w-full rounded-lg bg-black px-4 py-2 text-white"
            >
              Enter
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-black md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attendance + WFH Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Summary harian untuk team. Admin sahaja boleh setup WFH.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border px-4 py-2 text-sm">{selectedUser}</span>
            <span className="rounded-full border px-4 py-2 text-sm">{todayDay}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">Total Leave</p>
            <p className="mt-2 text-4xl font-bold">{leaveToday.length}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">WFH Today</p>
            <p className="mt-2 text-4xl font-bold">{wfhToday.length}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">In Office</p>
            <p className="mt-2 text-4xl font-bold">{inOfficeToday.length}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">Team Size</p>
            <p className="mt-2 text-4xl font-bold">{team.length}</p>
          </div>
        </div>

        <div className="flex gap-2 rounded-2xl border p-2">
          <button
            onClick={() => setTab("dashboard")}
            className={`rounded-xl px-4 py-2 ${tab === "dashboard" ? "bg-black text-white" : "bg-gray-100"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab("daily")}
            className={`rounded-xl px-4 py-2 ${tab === "daily" ? "bg-black text-white" : "bg-gray-100"}`}
          >
            Daily Update
          </button>
          <button
            onClick={() => setTab("wfh")}
            className={`rounded-xl px-4 py-2 ${tab === "wfh" ? "bg-black text-white" : "bg-gray-100"}`}
          >
            WFH Summary
          </button>
        </div>

        {tab === "dashboard" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <h2 className="mb-4 text-xl font-bold">On Leave Today</h2>
              <div className="space-y-3">
                {leaveToday.length === 0 && <p className="text-sm text-gray-500">No leave today.</p>}
                {leaveToday.map((record) => (
                  <div key={record.name} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar name={record.name} />
                    <div>
                      <p className="font-semibold">{record.name}</p>
                      <p className="text-sm text-gray-500">
                        {record.leaveType}{record.note ? ` · ${record.note}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <h2 className="mb-4 text-xl font-bold">WFH Today</h2>
              <div className="space-y-3">
                {wfhToday.length === 0 && <p className="text-sm text-gray-500">No WFH today.</p>}
                {wfhToday.map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar name={name} />
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-gray-500">{(wfhMap[name] || []).join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <h2 className="mb-4 text-xl font-bold">In Office Today</h2>
              <div className="space-y-3">
                {inOfficeToday.map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar name={name} />
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-gray-500">Available in office</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "daily" && (
          <div className="rounded-2xl border p-4">
            <h2 className="text-xl font-bold">Daily Leave Update</h2>
            <p className="mt-1 text-sm text-gray-600">
              User biasa hanya boleh submit untuk diri sendiri. Admin boleh pilih sesiapa.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                {isAdmin ? (
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                  <div className="rounded-lg border px-3 py-2">{selectedUser}</div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Leave Type</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Note</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder="Reason / note"
                />
              </div>
            </div>

            <button
              onClick={handleSaveLeave}
              className="mt-4 rounded-lg bg-black px-4 py-2 text-white"
            >
              Save Leave Record
            </button>
          </div>
        )}

        {tab === "wfh" && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-4">
              <h2 className="text-xl font-bold">Weekly WFH Summary</h2>
              <p className="mt-1 text-sm text-gray-600">
                Semua orang boleh view. Hanya Admin boleh edit.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-5">
                {weekdays.map((day) => (
                  <div key={day} className="rounded-2xl border p-4">
                    <p className="mb-3 font-semibold">{day}</p>
                    <div className="space-y-2">
                      {team.filter((name) => (wfhMap[name] || []).includes(day)).length === 0 ? (
                        <p className="text-sm text-gray-400">No WFH</p>
                      ) : (
                        team
                          .filter((name) => (wfhMap[name] || []).includes(day))
                          .map((name) => (
                            <div key={name} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                              <Avatar name={name} />
                              <span className="text-sm">{name}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-2xl border p-4">
                <h2 className="text-xl font-bold">Admin WFH Setup</h2>
                <p className="mt-1 text-sm text-gray-600">Maximum 2 hari untuk setiap orang.</p>

                <div className="mt-4 space-y-4">
                  {team.map((name) => (
                    <div key={name} className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <Avatar name={name} />
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="text-sm text-gray-500">
                            Current: {(wfhMap[name] || []).join(", ") || "No WFH selected"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {weekdays.map((day) => (
                          <button
                            key={day}
                            onClick={() => toggleWfh(name, day)}
                            className={`rounded-xl border px-3 py-2 text-sm ${
                              (wfhMap[name] || []).includes(day)
                                ? "bg-black text-white"
                                : "bg-white"
                            }`}
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
    </div>
  );
}
