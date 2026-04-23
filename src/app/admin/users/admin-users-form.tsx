"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "ADMIN" | "PROFESSOR" | "CIDA";
};

const CreateUserForm = memo(function CreateUserForm({
  onUserCreated,
}: {
  onUserCreated: () => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"PROFESSOR" | "ADMIN" | "CIDA">("PROFESSOR");
  const [err, setErr] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <div>
      {err && <p className="mb-2 text-sm text-app-danger">{err}</p>}
      <form
        key={formKey}
        className="glass max-w-md space-y-2 p-4"
        autoComplete="off"
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
            setErr((j as { error?: string }).error || t("admin.usersCreateFail"));
            return;
          }
          setEmail("");
          setPassword("");
          setName("");
          setRole("PROFESSOR");
          setFormKey((k) => k + 1);
          onUserCreated();
        }}
      >
        <h2 className="text-sm font-semibold text-app-fg">
          {t("admin.usersNewUser")}
        </h2>
        <p className="text-xs text-app-muted/85">{t("admin.usersNewHint")}</p>
        <input
          className="input-glass w-full px-2 py-1.5"
          type="email"
          name="new-user-email"
          placeholder={t("admin.usersEmailPh")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input-glass w-full px-2 py-1.5"
          type="password"
          name="new-user-password"
          autoComplete="new-password"
          placeholder={t("admin.usersPasswordPh")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          className="input-glass w-full px-2 py-1.5"
          name="new-user-name"
          placeholder={t("admin.usersNamePh")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="input-glass w-full px-2 py-1.5"
          name="new-user-role"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "PROFESSOR" | "ADMIN" | "CIDA")
          }
        >
          <option value="PROFESSOR">{t("admin.usersRoleOptProf")}</option>
          <option value="ADMIN">{t("admin.usersRoleOptAdmin")}</option>
          <option value="CIDA">{t("admin.usersRoleOptCida")}</option>
        </select>
        <button type="submit" className="btn-glass-primary w-full py-2 text-sm">
          {t("admin.usersCreate")}
        </button>
      </form>
    </div>
  );
});

function EditableUserName({
  user,
  onSaved,
  showLabel = true,
}: {
  user: UserRow;
  onSaved: () => void;
  showLabel?: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(user.name ?? "");
  useEffect(() => {
    setValue(user.name ?? "");
  }, [user.id, user.name]);

  return (
    <label
      className={
        showLabel
          ? "flex w-full min-w-0 max-w-sm flex-col gap-0.5 sm:max-w-md"
          : "block w-full min-w-0"
      }
    >
      {showLabel && (
        <span className="text-[11px] text-app-muted/85">
          {t("admin.usersNameLabel")}
        </span>
      )}
      <input
        className="input-glass w-full min-w-[12rem] max-w-md px-2 py-1.5 text-sm"
        value={value}
        placeholder={t("admin.usersDisplayNamePh")}
        onChange={(e) => setValue(e.target.value)}
        onBlur={async () => {
          const next = value.trim() || null;
          const current = (user.name?.trim() || null) ?? null;
          if (next === current) {
            return;
          }
          const r = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: user.id, name: next }),
          });
          if (r.ok) {
            onSaved();
          }
        }}
      />
    </label>
  );
}

export function AdminUsersForm() {
  const { t } = useI18n();
  const [list, setList] = useState<UserRow[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    if (r.ok) {
      setList(await r.json());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUserCreated = useCallback(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <CreateUserForm onUserCreated={onUserCreated} />
      <div className="overflow-x-auto rounded-2xl border border-app-border/80 bg-app-card/75 shadow-sm">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-app-border/80 bg-app-primary/[0.06]">
              <th
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90"
              >
                {t("admin.usersTableColEmail")}
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90"
              >
                {t("admin.usersTableColName")}
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90"
              >
                {t("admin.usersTableColRole")}
              </th>
              <th
                scope="col"
                className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-app-muted/90"
              >
                {t("admin.usersTableColActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr
                key={u.id}
                className="border-b border-app-border/45 last:border-0"
              >
                <td className="max-w-xs align-middle px-3 py-2.5">
                  <div className="font-medium text-app-fg break-all">
                    {u.email}
                  </div>
                </td>
                <td className="align-middle px-3 py-2.5">
                  <EditableUserName
                    user={u}
                    onSaved={load}
                    showLabel={false}
                  />
                </td>
                <td className="min-w-[14rem] align-middle px-3 py-2.5">
                  <select
                    className="input-glass w-full max-w-xs px-2 py-1.5 text-sm"
                    value={u.role}
                    onChange={async (e) => {
                      const next = e.target.value as UserRow["role"];
                      const r = await fetch("/api/admin/users", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: u.id, role: next }),
                      });
                      if (!r.ok) {
                        const j = (await r.json().catch(() => ({}))) as {
                          message?: string;
                        };
                        alert(j.message || t("admin.usersRoleFail"));
                        await load();
                        return;
                      }
                      await load();
                    }}
                  >
                    <option value="PROFESSOR">
                      {t("admin.usersRoleOptProf")}
                    </option>
                    <option value="ADMIN">{t("admin.usersRoleOptAdmin")}</option>
                    <option value="CIDA">{t("admin.usersRoleOptCida")}</option>
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle">
                  <button
                    type="button"
                    className="text-sm text-app-danger hover:underline"
                    onClick={async () => {
                      if (!confirm(t("admin.usersDeleteConfirm"))) return;
                      await fetch(
                        `/api/admin/users?id=${encodeURIComponent(u.id)}`,
                        { method: "DELETE" }
                      );
                      await load();
                    }}
                  >
                    {t("admin.usersDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
