"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BookMarked, ChevronDown, LayoutGrid, List, Plus, Search, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import { AppNav } from "@/components/layout/AppNav";
import { authHeaders } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type TopicLite = { _id: string; name: string; name_vi: string };

type Row = {
  id: string;
  word: string;
  type: string;
  ipa: string;
  meaning: string;
  savedAt: string;
  mastered: boolean;
  topicLabel: string;
  topicId: string | null;
};

/** Loại từ cố định (tiếng Anh), lưu nguyên value xuống API. */
const WORD_TYPE_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "article",
  "phrase",
  "idiom",
  "abbreviation",
  "other",
] as const;

type SortValue = "date_asc" | "date_desc" | "alpha_asc" | "alpha_desc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "date_asc", label: "Cũ → mới" },
  { value: "date_desc", label: "Mới → cũ" },
  { value: "alpha_asc", label: "A → Z" },
  { value: "alpha_desc", label: "Z → A" },
];

function parseTopic(
  v: Record<string, unknown>,
): { label: string; id: string | null } {
  const t = v.topic_id;
  if (t && typeof t === "object" && t !== null) {
    const o = t as { _id?: unknown; name_vi?: string; name?: string };
    return {
      id: o._id != null ? String(o._id) : null,
      label: String(o.name_vi || o.name || "—"),
    };
  }
  if (typeof t === "string" && t) {
    return { id: t, label: "—" };
  }
  return { id: null, label: "—" };
}

function WordTypeSelect({
  id,
  value,
  onChange,
  required,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  const preset = (WORD_TYPE_OPTIONS as readonly string[]).includes(value);
  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">— Chọn loại từ —</option>
      {WORD_TYPE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {value && !preset && (
        <option value={value}>{value} (dữ liệu cũ)</option>
      )}
    </select>
  );
}

export default function VocabularyPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [sort, setSort] = useState<SortValue>("date_desc");
  const [topicFilterId, setTopicFilterId] = useState("");
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [topics, setTopics] = useState<TopicLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    word: "",
    meaning: "",
    word_type: "",
    ipa: "",
    topic_id: "",
    mastered: false,
  });
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({
    word: "",
    meaning: "",
    word_type: "",
    ipa: "",
    topic_id: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadTopics = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const res = await fetch("/api/topics", { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setTopics(
          json.data.map((x: { _id: string; name: string; name_vi: string }) => ({
            _id: String(x._id),
            name: x.name,
            name_vi: x.name_vi,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const buildListUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced) params.set("search", debounced);
    params.set("sort", sort);
    if (topicFilterId) params.set("topic_id", topicFilterId);
    const q = params.toString();
    return q ? `?${q}` : "";
  }, [debounced, sort, topicFilterId]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setRows([]);
      setLoading(false);
      setError("Đăng nhập để xem kho từ vựng.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vocabularies${buildListUrl()}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Không tải được danh sách.");
        setRows([]);
        return;
      }
      const list = (json.data as Array<Record<string, unknown>>).map((v) => {
        const created = v.createdAt as string | undefined;
        const tp = parseTopic(v);
        return {
          id: String(v._id),
          word: String(v.word),
          type: String(v.word_type ?? ""),
          ipa: String(v.ipa ?? "—"),
          meaning: String(v.meaning),
          savedAt: created ? created.slice(0, 10) : "—",
          mastered: Boolean(v.mastered),
          topicLabel: tp.label,
          topicId: tp.id,
        };
      });
      setRows(list);
    } catch {
      setError("Lỗi mạng.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildListUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAddForm = () => {
    setForm({
      word: "",
      meaning: "",
      word_type: "",
      ipa: "",
      topic_id: "",
      mastered: false,
    });
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim() || !form.word_type) {
      alert("Nhập từ, nghĩa và chọn loại từ.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vocabularies", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          word: form.word.trim(),
          meaning: form.meaning.trim(),
          word_type: form.word_type,
          ipa: form.ipa.trim() || undefined,
          topic_id: form.topic_id || undefined,
          mastered: form.mastered,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Không lưu được.");
        return;
      }
      resetAddForm();
      setAddOpen(false);
      await load();
    } catch {
      alert("Lỗi mạng.");
    } finally {
      setSaving(false);
    }
  };

  const patchMastered = async (id: string, mastered: boolean) => {
    try {
      const res = await fetch(`/api/vocabularies/${id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ mastered }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Cập nhật thất bại.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, mastered } : r)));
    } catch {
      alert("Lỗi mạng.");
    }
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setEditForm({
      word: row.word,
      meaning: row.meaning,
      word_type: row.type,
      ipa: row.ipa === "—" ? "" : row.ipa,
      topic_id: row.topicId ?? "",
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.word_type) {
      alert("Chọn loại từ.");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/vocabularies/${editing.id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({
          word: editForm.word.trim(),
          meaning: editForm.meaning.trim(),
          word_type: editForm.word_type.trim(),
          ipa: editForm.ipa.trim() || "",
          topic_id: editForm.topic_id || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || "Không cập nhật được.");
        return;
      }
      setEditing(null);
      await load();
    } catch {
      alert("Lỗi mạng.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppNav />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kho từ vựng</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm, sửa, sắp xếp và lọc theo chủ đề; đánh dấu đã thuộc.
              {loading ? " — đang tải…" : ""}
            </p>
            {error && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{error}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setAddOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Thêm từ vựng
            </button>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95"
            >
              <BookMarked className="h-4 w-4" />
              Làm mới
            </button>
          </div>
        </div>

        <div className="glass mb-6 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm trong từ hoặc nghĩa…"
                className="w-full rounded-2xl border border-input bg-background py-3 pl-10 pr-4 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Sắp xếp</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortValue)}
                    className="appearance-none rounded-xl border border-input bg-background py-2 pl-3 pr-9 text-sm outline-none ring-ring focus:ring-2"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>

              <div className="relative flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopicDropdownOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition",
                    topicFilterId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 hover:bg-muted",
                    topicDropdownOpen && "ring-2 ring-ring",
                  )}
                >
                  Chủ đề
                  <ChevronDown
                    className={cn("h-4 w-4 transition", topicDropdownOpen && "rotate-180")}
                  />
                </button>
                {topicDropdownOpen && (
                  <select
                    value={topicFilterId}
                    onChange={(e) => {
                      setTopicFilterId(e.target.value);
                      setTopicDropdownOpen(false);
                    }}
                    className="min-w-[12rem] rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-md"
                    autoFocus
                  >
                    <option value="">Tất cả chủ đề</option>
                    {topics.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name_vi}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="ml-auto flex rounded-full border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "rounded-full p-2",
                    view === "table" ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                  aria-label="Dạng bảng"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={cn(
                    "rounded-full p-2",
                    view === "cards" ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                  aria-label="Dạng thẻ"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {view === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Từ</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">IPA</th>
                  <th className="px-4 py-3 font-medium">Nghĩa</th>
                  <th className="px-4 py-3 font-medium">Chủ đề</th>
                  <th className="px-4 py-3 font-medium">Đã thuộc</th>
                  <th className="px-4 py-3 font-medium">Ngày lưu</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      Chưa có từ nào hoặc không khớp bộ lọc.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-semibold">{row.word}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.ipa}
                    </td>
                    <td className="px-4 py-3">{row.meaning}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.topicLabel}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.mastered}
                        onChange={(e) => patchMastered(row.id, e.target.checked)}
                        className="rounded border-input"
                        aria-label="Đã thuộc"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.savedAt}</td>
                    <td className="px-4 py-3 text-right opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex rounded-lg p-1.5 hover:bg-muted"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <motion.article
                key={row.id}
                layout
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold">{row.word}</h3>
                    <p className="text-xs text-muted-foreground">
                      {row.type} · {row.ipa}
                    </p>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.mastered}
                      onChange={(e) => patchMastered(row.id, e.target.checked)}
                      className="rounded"
                    />
                    Đã thuộc
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Chủ đề: {row.topicLabel}</p>
                <p className="mt-3 text-sm text-foreground/90">{row.meaning}</p>
                <p className="mt-2 text-xs text-muted-foreground">Lưu: {row.savedAt}</p>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  Sửa
                </button>
              </motion.article>
            ))}
          </div>
        )}

        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Đóng"
              onClick={() => setAddOpen(false)}
            />
            <div
              role="dialog"
              className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Thêm từ vựng</h3>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitNew} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">Từ *</span>
                  <input
                    required
                    value={form.word}
                    onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">Nghĩa *</span>
                  <input
                    required
                    value={form.meaning}
                    onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">Loại từ *</span>
                  <WordTypeSelect
                    value={form.word_type}
                    onChange={(v) => setForm((f) => ({ ...f, word_type: v }))}
                    required
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">IPA</span>
                  <input
                    value={form.ipa}
                    onChange={(e) => setForm((f) => ({ ...f, ipa: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">Chủ đề (topic)</span>
                  <select
                    value={form.topic_id}
                    onChange={(e) => setForm((f) => ({ ...f, topic_id: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Không gán —</option>
                    {topics.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name_vi} ({t.name})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.mastered}
                    onChange={(e) => setForm((f) => ({ ...f, mastered: e.target.checked }))}
                    className="rounded border-input"
                  />
                  Đã thuộc
                </label>
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Đang lưu…" : "Lưu từ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div
              role="dialog"
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <h3 className="text-lg font-semibold">Sửa từ vựng</h3>
              <form onSubmit={submitEdit} className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Từ</span>
                  <input
                    required
                    value={editForm.word}
                    onChange={(e) => setEditForm((f) => ({ ...f, word: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Nghĩa</span>
                  <input
                    required
                    value={editForm.meaning}
                    onChange={(e) => setEditForm((f) => ({ ...f, meaning: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Loại từ</span>
                  <WordTypeSelect
                    value={editForm.word_type}
                    onChange={(v) => setEditForm((f) => ({ ...f, word_type: v }))}
                    required
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">IPA</span>
                  <input
                    value={editForm.ipa}
                    onChange={(e) => setEditForm((f) => ({ ...f, ipa: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Chủ đề</span>
                  <select
                    value={editForm.topic_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, topic_id: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Không gán —</option>
                    {topics.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name_vi} ({t.name})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-xl border border-border px-4 py-2 text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {editSaving ? "Đang lưu…" : "Cập nhật"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
