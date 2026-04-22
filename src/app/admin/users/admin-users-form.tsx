"use client";

import { useCallback, useEffect, useState } from "react";
type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "ADMIN" | "PROFESSOR" | "CIDA";
};

export function AdminUsersForm() {
  const [list, setList] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"PROFESSOR" | "ADMIN" | "CIDA">("PROFESSOR");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-red-600">{err}</p>}

      <form
        className="max-w-md space-y-2 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const r = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              password,
              name: name.trim() || undefined,
              role,
            }),
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            setErr((j as { error?: string }).error || "Failed");
            return;
          }
          setEmail("");
          setPassword("");
          setName("");
          setRole("PROFESSOR");
          await load();
        }}
      >
        <h2 className="text-sm font-semibold">New user</h2>
        <input
          className="w-full rounded border border-slate-200 px-2 py-1.5"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-slate-200 px-2 py-1.5"
          type="password"
          placeholder="Password (8+)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          className="w-full rounded border border-slate-200 px-2 py-1.5"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="w-full rounded border border-slate-200 px-2 py-1.5"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "PROFESSOR" | "ADMIN" | "CIDA")
          }
        >
          <option value="PROFESSOR">Professor</option>
          <option value="ADMIN">Admin</option>
          <option value="CIDA">CIDA (read-only)</option>
        </select>
        <button
          type="submit"
          className="w-full rounded bg-slate-900 py-2 text-sm text-white"
        >
          Create user
        </button>
      </form>

      <ul className="space-y-2">
        {list.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{u.email}</span>{" "}
              <span className="text-xs text-slate-500">{u.role}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded border border-slate-200 px-2 py-1 text-sm"
                value={u.role}
                onChange={async (e) => {
                  const next = e.target.value as UserRow["role"];
                  await fetch("/api/admin/users", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: u.id, role: next }),
                  });
                  await load();
                }}
              >
                <option value="PROFESSOR">PROFESSOR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="CIDA">CIDA</option>
              </select>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  if (!confirm("Delete this user?")) return;
                  await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, {
                    method: "DELETE",
                  });
                  await load();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
