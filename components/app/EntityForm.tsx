"use client";

import { useState } from "react";
import type { EntityConfig, FieldDef } from "@/lib/app/entity";
import { Button, FormLabel, FormMessage, Input, SelectField, Textarea, ToggleField } from "./ui/Primitives";

type FormValues = Record<string, string | number | boolean | null>;

function initialFor(fields: ReadonlyArray<FieldDef>, existing?: Record<string, unknown>): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    if (existing && f.name in existing) {
      const v = existing[f.name];
      out[f.name] = (v as string | number | boolean | null) ?? null;
    } else if (f.defaultValue !== undefined) {
      out[f.name] = f.defaultValue as string | number | boolean | null;
    } else {
      out[f.name] = f.kind === "toggle" ? false : f.kind === "number" ? 0 : "";
    }
  }
  return out;
}

export function EntityForm<Row>({
  config,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  pending = false,
}: {
  config: EntityConfig<Row>;
  initial?: Record<string, unknown>;
  onSubmit: (values: FormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const [values, setValues] = useState<FormValues>(initialFor(config.fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);

  const set = (name: string, v: string | number | boolean | null) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormErr(null);

    // Validate with the entity schema. Our schemas are a mix of raw fields
    // and synthesized ones (location_lng/lat). The EntityPage wires up the
    // mapping to the Supabase row itself — we just return the flat values.
    const parsed = config.schema.safeParse(values);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }

    try {
      await onSubmit(values);
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {config.fields.map((f) => (
        <FieldRenderer key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} error={errors[f.name]} />
      ))}

      {formErr ? (
        <div className="rounded-md border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
          {formErr}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldDef;
  value: string | number | boolean | null | undefined;
  onChange: (v: string | number | boolean | null) => void;
  error?: string;
}) {
  const common = {
    id: field.name,
    required: field.required,
    "aria-invalid": error ? true : undefined,
  };

  let control: React.ReactNode;
  switch (field.kind) {
    case "textarea":
      control = (
        <Textarea
          {...common}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
      break;
    case "number":
      control = (
        <Input
          {...common}
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={value === null || value === undefined ? "" : (value as number | string)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return onChange(null);
            const n = parseFloat(v);
            onChange(Number.isNaN(n) ? null : n);
          }}
        />
      );
      break;
    case "toggle":
      control = <ToggleField checked={Boolean(value)} onCheckedChange={onChange} />;
      break;
    case "select":
      control = (
        <SelectField
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
          options={field.options ?? []}
          placeholder={field.placeholder}
        />
      );
      break;
    case "date":
      control = (
        <Input
          {...common}
          type="datetime-local"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
      break;
    default:
      control = (
        <Input
          {...common}
          type="text"
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }

  return (
    <div>
      <FormLabel htmlFor={field.name}>
        {field.label}
        {field.required ? <span className="text-[color:var(--nafas-danger)] ml-1">*</span> : null}
      </FormLabel>
      {control}
      <FormMessage error={error} help={field.help} />
    </div>
  );
}
