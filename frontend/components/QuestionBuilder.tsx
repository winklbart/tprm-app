"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea } from "@/components/ui/Input";
import type { TemplateQuestionPayload } from "@/lib/api";
import type { TemplateQuestionType } from "@/lib/types";
import { QUESTION_TYPE_ICONS, QUESTION_TYPE_LABELS } from "@/lib/types";

const QUESTION_TYPES: TemplateQuestionType[] = ["yes_no", "text", "multiple_choice", "file_upload", "rating"];

// ── types ────────────────────────────────────────────────────────────────────

interface DraftState {
  title: string;
  description: string | null;
  type: TemplateQuestionType;
  options: string[] | null;
  required: boolean;
  optionInput: string;
}

interface EditingState {
  index: number;
  draft: DraftState;
}

interface Props {
  questions: TemplateQuestionPayload[];
  onChange: (questions: TemplateQuestionPayload[]) => void;
}

const BLANK_DRAFT: DraftState = {
  title: "",
  description: null,
  type: "yes_no",
  options: null,
  required: true,
  optionInput: "",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function draftToPayload(draft: DraftState, sortOrder: number): TemplateQuestionPayload {
  return {
    sort_order: sortOrder,
    title: draft.title.trim(),
    description: draft.description || null,
    type: draft.type,
    options: draft.type === "multiple_choice" ? (draft.options ?? []) : null,
    required: draft.required,
  };
}

// ── main component ────────────────────────────────────────────────────────────

export default function QuestionBuilder({ questions, onChange }: Props) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftState>({ ...BLANK_DRAFT });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...questions];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next.map((q, i) => ({ ...q, sort_order: i + 1 })));
  };

  const remove = (index: number) => {
    onChange(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, sort_order: i + 1 })));
  };

  const startEdit = (index: number) => {
    const q = questions[index];
    setEditing({
      index,
      draft: {
        title: q.title,
        description: q.description ?? null,
        type: q.type as TemplateQuestionType,
        options: q.options ?? null,
        required: q.required,
        optionInput: "",
      },
    });
  };

  const saveEdit = () => {
    if (!editing || !editing.draft.title.trim()) return;
    const next = [...questions];
    next[editing.index] = draftToPayload(editing.draft, editing.index + 1);
    onChange(next);
    setEditing(null);
  };

  const addNewQuestion = () => {
    if (!newDraft.title.trim()) return;
    onChange([...questions, draftToPayload(newDraft, questions.length + 1)]);
    setAdding(false);
    setNewDraft({ ...BLANK_DRAFT });
  };

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q, index) => (
        <div key={index}>
          {editing?.index === index ? (
            <QuestionForm
              draft={editing.draft}
              onChange={(d) => setEditing({ index, draft: d })}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              saveLabel="Save"
            />
          ) : (
            <QuestionCard
              question={q}
              index={index}
              total={questions.length}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onEdit={() => startEdit(index)}
              onDelete={() => remove(index)}
            />
          )}
        </div>
      ))}

      {adding ? (
        <QuestionForm
          draft={newDraft}
          onChange={setNewDraft}
          onSave={addNewQuestion}
          onCancel={() => { setAdding(false); setNewDraft({ ...BLANK_DRAFT }); }}
          saveLabel="Add Question"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            border: "0.5px dashed #1e2433",
            borderRadius: 8,
            padding: "10px 16px",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
            textAlign: "left",
            fontSize: 13,
            width: "100%",
          }}
        >
          + Add question
        </button>
      )}
    </div>
  );
}

// ── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: TemplateQuestionPayload;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const arrowBtnStyle: React.CSSProperties = {
  background: "none",
  border: "0.5px solid #1e2433",
  borderRadius: 6,
  color: "#64748b",
  cursor: "pointer",
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  padding: 0,
};

function QuestionCard({ question, index, total, onMoveUp, onMoveDown, onEdit, onDelete }: QuestionCardProps) {
  return (
    <div
      style={{
        background: "#0f1117",
        border: "0.5px solid #1e2433",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span className="text-xs font-mono" style={{ color: "#64748b", minWidth: 20 }}>
        {index + 1}.
      </span>
      <span style={{ color: "#64748b", fontSize: 16, minWidth: 18 }}>
        {QUESTION_TYPE_ICONS[question.type as TemplateQuestionType]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "#f1f5f9" }}>{question.title}</p>
        <p className="text-xs" style={{ color: "#64748b" }}>
          {QUESTION_TYPE_LABELS[question.type as TemplateQuestionType]}
          {question.required && (
            <span style={{ color: "#f87171", marginLeft: 6 }}>required</span>
          )}
          {question.type === "multiple_choice" && question.options && (
            <span style={{ marginLeft: 6 }}>
              {question.options.length} option{question.options.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          style={{ ...arrowBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
          title="Move up"
        >↑</button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          style={{ ...arrowBtnStyle, opacity: index === total - 1 ? 0.3 : 1 }}
          title="Move down"
        >↓</button>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>×</Button>
      </div>
    </div>
  );
}

// ── QuestionForm ──────────────────────────────────────────────────────────────

interface QuestionFormProps {
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}

function QuestionForm({ draft, onChange, onSave, onCancel, saveLabel }: QuestionFormProps) {
  const set = (partial: Partial<DraftState>) => onChange({ ...draft, ...partial });

  const addOption = () => {
    const opt = draft.optionInput.trim();
    if (!opt) return;
    set({ options: [...(draft.options ?? []), opt], optionInput: "" });
  };

  return (
    <div
      style={{
        background: "#0f1117",
        border: "0.5px solid #4f46e5",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            label="Question title *"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Enter question text…"
            autoFocus
          />
        </div>
        <Select
          label="Type"
          value={draft.type}
          onChange={(e) => set({ type: e.target.value as TemplateQuestionType, options: null })}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>{QUESTION_TYPE_ICONS[t]} {QUESTION_TYPE_LABELS[t]}</option>
          ))}
        </Select>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 text-sm" style={{ color: "#f1f5f9", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => set({ required: e.target.checked })}
              style={{ accentColor: "#4f46e5" }}
            />
            Required
          </label>
        </div>
        <div className="col-span-2">
          <TextArea
            label="Helper text (optional)"
            value={draft.description ?? ""}
            onChange={(e) => set({ description: e.target.value || null })}
            placeholder="Additional context for the vendor…"
            style={{ minHeight: 56 }}
          />
        </div>
      </div>

      {draft.type === "multiple_choice" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: "#64748b" }}>Options</p>
          {(draft.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="flex-1 text-xs px-2 py-1"
                style={{ background: "#131720", border: "0.5px solid #1e2433", borderRadius: 6, color: "#f1f5f9" }}
              >
                {opt}
              </span>
              <button
                type="button"
                onClick={() => set({ options: (draft.options ?? []).filter((_, idx) => idx !== i) })}
                style={{ ...arrowBtnStyle, color: "#f87171" }}
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="flex-1 text-xs outline-none"
              style={{
                background: "#0f1117",
                border: "0.5px solid #1e2433",
                borderRadius: 6,
                padding: "6px 10px",
                color: "#f1f5f9",
              }}
              placeholder="Add option…"
              value={draft.optionInput}
              onChange={(e) => set({ optionInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={addOption}>Add</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!draft.title.trim()}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
