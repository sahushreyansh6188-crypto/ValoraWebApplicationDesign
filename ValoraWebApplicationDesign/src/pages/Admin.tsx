import { useState, useEffect } from "react";
import type { NavigateFn } from "../types";
import { adminApi } from "../services/api";

interface AdminProps {
  navigate: NavigateFn;
}

type AdminTab = "overview" | "users" | "reports" | "moderation" | "suspensions" | "audit" | "subscriptions";

const statCards = [
  { label: "Total users", value: "12,847", change: "+234 this week", up: true },
  { label: "Monthly active", value: "8,234", change: "+12% vs last month", up: true },
  { label: "New today", value: "47", change: "-3 vs yesterday", up: false },
  { label: "Pending reports", value: "12", change: "3 critical", up: false },
  { label: "Active subscriptions", value: "3,421", change: "+89 this week", up: true },
  { label: "Matches today", value: "318", change: "+22% vs average", up: true },
];

const mockUsers = [
  { id: "u001", name: "Jordan Lee", email: "jordan@example.com", age: 31, joined: "Mar 1, 2026", status: "active", plan: "Connect", reports: 0 },
  { id: "u002", name: "Sam Rivera", email: "sam@example.com", age: 28, joined: "Feb 14, 2026", status: "active", plan: "Free", reports: 1 },
  { id: "u003", name: "River Walsh", email: "river@example.com", age: 34, joined: "Jan 28, 2026", status: "suspended", plan: "Connect", reports: 3 },
  { id: "u004", name: "Maya Singh", email: "maya@example.com", age: 26, joined: "Mar 8, 2026", status: "active", plan: "Annual", reports: 0 },
  { id: "u005", name: "Devon Clarke", email: "devon@example.com", age: 33, joined: "Feb 2, 2026", status: "active", plan: "Free", reports: 0 },
  { id: "u006", name: "Priya Nair", email: "priya@example.com", age: 30, joined: "Mar 11, 2026", status: "pending", plan: "Free", reports: 0 },
];

const mockReports = [
  { id: "r001", reporter: "Sam Rivera", reported: "u999", reason: "Inappropriate messages", severity: "high", status: "open", time: "2 hours ago" },
  { id: "r002", reporter: "Maya Singh", reported: "u888", reason: "Misleading profile information", severity: "medium", status: "open", time: "5 hours ago" },
  { id: "r003", reporter: "Jordan Lee", reported: "u777", reason: "Harassment", severity: "high", status: "under review", time: "1 day ago" },
  { id: "r004", reporter: "Devon Clarke", reported: "u666", reason: "Spam / solicitation", severity: "low", status: "resolved", time: "2 days ago" },
];

const mockAudit = [
  { id: "a1", action: "User suspended", actor: "Admin (system)", target: "River Walsh (u003)", time: "Jan 30, 2026 · 11:42 AM" },
  { id: "a2", action: "Report resolved", actor: "Moderator Aria", target: "Report r004", time: "Mar 11, 2026 · 9:15 AM" },
  { id: "a3", action: "Account verified", actor: "System", target: "Priya Nair (u006)", time: "Mar 11, 2026 · 8:01 AM" },
  { id: "a4", action: "Profile removed", actor: "Moderator Ben", target: "Anonymous (u555)", time: "Mar 10, 2026 · 4:30 PM" },
  { id: "a5", action: "Subscription upgraded", actor: "System", target: "Maya Singh (u004)", time: "Mar 8, 2026 · 2:22 PM" },
];

const mockSubs = [
  { plan: "Free", count: 9426, revenue: "$0", pct: 73 },
  { plan: "Connect (monthly)", count: 2214, revenue: "$33,210/mo", pct: 17 },
  { plan: "Annual", count: 1207, revenue: "$119,493/yr", pct: 10 },
];

const tabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "reports", label: "Reports" },
  { id: "moderation", label: "Moderation" },
  { id: "suspensions", label: "Suspensions" },
  { id: "audit", label: "Audit Log" },
  { id: "subscriptions", label: "Subscriptions" },
];

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    active: "bg-brand-light text-brand",
    suspended: "bg-danger-light text-danger",
    pending: "bg-clay-light text-clay",
    open: "bg-danger-light text-danger",
    "under review": "bg-info-light text-info",
    resolved: "bg-brand-light text-brand",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${configs[status] || "bg-cream text-stone"}`}>
      {status}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = { high: "bg-danger", medium: "bg-warning", low: "bg-brand-mid" };
  return <span className={`w-2 h-2 rounded-full inline-block ${colors[severity] || "bg-stone"}`} aria-label={`Severity: ${severity}`} />;
}

export default function Admin({ navigate }: AdminProps) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState(mockUsers);
  const [reports, setReports] = useState(mockReports);

  useEffect(() => {
    let active = true;
    adminApi.getUsers().then((data) => {
      if (active && data && data.length > 0) setUsers(data);
    }).catch(() => {});

    adminApi.getReports().then((data) => {
      if (active && data && data.length > 0) setReports(data);
    }).catch(() => {});

    return () => { active = false; };
  }, []);

  const handleToggleUser = async (userId: string, newStatus: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
    await adminApi.updateUserStatus(userId, newStatus).catch(() => {});
  };

  const handleResolveReport = async (reportId: string) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)));
    await adminApi.updateReportStatus(reportId, "resolved").catch(() => {});
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="md:ml-60 min-h-screen bg-ivory pb-24 md:pb-0">
      {/* Admin header */}
      <div className="bg-charcoal text-ivory px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl">Admin Dashboard</h1>
          <p className="text-xs text-stone mt-0.5">Valora platform administration</p>
        </div>
        <button
          onClick={() => navigate("settings")}
          className="text-xs text-stone hover:text-pebble transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back to app
        </button>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-mist px-4 overflow-x-auto" role="tablist">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 py-3.5 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                tab === t.id ? "border-brand text-brand" : "border-transparent text-stone hover:text-flint"
              }`}
            >
              {t.label}
              {t.id === "reports" && (
                <span className="ml-1.5 w-4 h-4 bg-danger text-ivory text-[10px] font-bold rounded-full inline-flex items-center justify-center">
                  {mockReports.filter((r) => r.status === "open").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6" role="tabpanel">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((s) => (
                <div key={s.label} className="bg-white border border-mist rounded-2xl p-5">
                  <p className="text-xs text-stone mb-1">{s.label}</p>
                  <p className="font-display text-3xl text-charcoal mb-2">{s.value}</p>
                  <p className={`text-xs flex items-center gap-1 ${s.up ? "text-brand" : "text-clay"}`}>
                    <span>{s.up ? "↑" : "↓"}</span>
                    {s.change}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent reports summary */}
            <div className="bg-white border border-mist rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-charcoal">Recent reports</h3>
                <button onClick={() => setTab("reports")} className="text-xs text-clay hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {mockReports.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <SeverityDot severity={r.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-flint truncate">{r.reason}</p>
                      <p className="text-xs text-stone">Reported by {r.reporter} · {r.time}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users…"
                  aria-label="Search users"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <span className="text-xs text-stone">{filteredUsers.length} results</span>
            </div>

            <div className="bg-white border border-mist rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="border-b border-mist bg-ivory">
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">User</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Age</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Joined</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Plan</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Status</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Reports</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-stone">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-ivory transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-charcoal">{u.name}</p>
                          <p className="text-xs text-stone">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 text-stone">{u.age}</td>
                        <td className="px-4 py-3 text-stone text-xs">{u.joined}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-flint bg-cream px-2.5 py-1 rounded-full">{u.plan}</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                        <td className="px-4 py-3">
                          {u.reports > 0 ? (
                            <span className="text-danger text-xs font-semibold">{u.reports}</span>
                          ) : (
                            <span className="text-stone text-xs">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-brand hover:underline">View</button>
                            {u.status !== "suspended" ? (
                              <button onClick={() => handleToggleUser(u.id, "suspended")} className="text-xs text-danger hover:underline">Suspend</button>
                            ) : (
                              <button onClick={() => handleToggleUser(u.id, "active")} className="text-xs text-stone hover:underline">Reinstate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {["All", "Open", "Under review", "Resolved"].map((f) => (
                <button key={f} className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white border border-mist text-flint hover:bg-cream transition-colors">
                  {f}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-white border border-mist rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <SeverityDot severity={r.severity} />
                      <h3 className="text-sm font-semibold text-charcoal">{r.reason}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <p className="text-xs text-stone mb-4">
                    Reported by <strong className="text-flint">{r.reporter}</strong> · {r.time}
                  </p>
                  {r.status !== "resolved" && (
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-brand text-ivory text-xs font-medium rounded-full hover:bg-brand-hover transition-colors">
                        Review profile
                      </button>
                      <button onClick={() => handleToggleUser(r.reported, "suspended")} className="px-4 py-2 bg-danger-light text-danger text-xs font-medium rounded-full hover:bg-red-100 transition-colors">
                        Suspend user
                      </button>
                      <button onClick={() => handleResolveReport(r.id)} className="px-4 py-2 bg-cream text-flint text-xs font-medium rounded-full hover:bg-mist transition-colors">
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODERATION */}
        {tab === "moderation" && (
          <div className="space-y-4">
            <div className="bg-white border border-mist rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">Moderation queue</h3>
              <p className="text-sm text-stone">No items requiring immediate moderation. All recent reports have been reviewed.</p>
            </div>
            <div className="bg-white border border-mist rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">Automated flags</h3>
              <div className="space-y-3">
                {[
                  { label: "Profiles with no photo after 7 days", count: 23 },
                  { label: "Accounts with 3+ reports", count: 4 },
                  { label: "Dormant accounts (90+ days)", count: 142 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-mist last:border-0">
                    <span className="text-sm text-flint">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-charcoal">{item.count}</span>
                      <button className="text-xs text-brand hover:underline">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUSPENSIONS */}
        {tab === "suspensions" && (
          <div className="bg-white border border-mist rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-mist">
              <h3 className="text-sm font-semibold text-charcoal">Active suspensions</h3>
            </div>
            <div className="divide-y divide-mist">
              {users.filter((u) => u.status === "suspended").map((u) => (
                <div key={u.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{u.name}</p>
                    <p className="text-xs text-stone">{u.email} · {u.reports} reports</p>
                    <p className="text-xs text-danger mt-1">Suspended Jan 30, 2026 · Reason: repeated reports</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-stone hover:underline">View history</button>
                    <button
                      onClick={() => handleToggleUser(u.id, "active")}
                      className="px-3.5 py-1.5 bg-brand-light text-brand text-xs font-medium rounded-full hover:bg-brand hover:text-ivory transition-colors"
                    >
                      Reinstate
                    </button>
                    <button
                      onClick={() => handleToggleUser(u.id, "banned")}
                      className="px-3.5 py-1.5 bg-danger-light text-danger text-xs font-medium rounded-full hover:bg-red-100 transition-colors"
                    >
                      Permanent ban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {tab === "audit" && (
          <div className="bg-white border border-mist rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-mist">
              <h3 className="text-sm font-semibold text-charcoal">Audit log</h3>
              <p className="text-xs text-stone mt-0.5">All administrative actions are recorded here.</p>
            </div>
            <div className="divide-y divide-mist">
              {mockAudit.map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{a.action}</p>
                      <p className="text-xs text-stone mt-0.5">
                        By <span className="font-medium text-flint">{a.actor}</span> · on {a.target}
                      </p>
                    </div>
                    <span className="text-xs text-stone shrink-0">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS */}
        {tab === "subscriptions" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mockSubs.map((s) => (
                <div key={s.plan} className="bg-white border border-mist rounded-2xl p-5">
                  <p className="text-xs text-stone mb-1">{s.plan}</p>
                  <p className="font-display text-3xl text-charcoal mb-1">{s.count.toLocaleString()}</p>
                  <p className="text-xs text-brand font-medium mb-3">{s.revenue}</p>
                  <div className="w-full bg-mist rounded-full h-1.5">
                    <div className="bg-brand h-1.5 rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-stone mt-1">{s.pct}% of user base</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-mist rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">Monthly recurring revenue</h3>
              <p className="font-display text-4xl text-charcoal">$42,704 <span className="text-lg text-stone font-sans">/mo</span></p>
              <p className="text-xs text-brand mt-2">↑ 14% vs last month</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
