"use client";

/**
 * Thin, opinionated primitives for the /app shell. We avoid pulling in
 * Radix UI (it's not installed) and instead compose @base-ui/react with
 * HealiX tokens so every dialog/sheet/tab looks editorial by default.
 *
 * These are NOT a replacement for a full shadcn install — they cover the
 * ~8 patterns the app shell actually needs and nothing more.
 */

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────
// Dialog (centered modal)
// ────────────────────────────────────────────────────────────────────────

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClassName = "w-[min(540px,calc(100vw-2rem))]",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2 outline-none",
            widthClassName,
            "rounded-xl border border-white/10 bg-[color:var(--nafas-bg2)] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 transition-all duration-200",
          )}
        >
          <div className="px-6 pt-5 pb-3 border-b border-white/5">
            <Dialog.Title className="font-[family-name:var(--font-fraunces)] text-[20px] leading-tight tracking-[-0.01em]">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-[13px] text-[color:var(--nafas-ink3)]">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <div className="px-6 py-5">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sheet (right-side drawer)
// ────────────────────────────────────────────────────────────────────────

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
  widthClassName = "w-[min(420px,100vw)]",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: "right" | "left";
  widthClassName?: string;
}) {
  const sideClass =
    side === "right"
      ? "right-0 data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full"
      : "left-0 data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[1px] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200" />
        <Dialog.Popup
          className={cn(
            "fixed top-0 bottom-0 z-[90] flex flex-col outline-none",
            sideClass,
            widthClassName,
            "bg-[color:var(--nafas-bg2)] border-l border-white/10 shadow-[-32px_0_80px_-20px_rgba(0,0,0,0.8)]",
            "transition-transform duration-300",
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-white/5">
            <div className="min-w-0">
              <Dialog.Title className="font-[family-name:var(--font-fraunces)] text-[18px] leading-tight tracking-[-0.01em]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[12.5px] text-[color:var(--nafas-ink3)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="shrink-0 size-8 grid place-items-center rounded-md text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
              aria-label="Fermer"
            >
              ✕
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Tabs
// ────────────────────────────────────────────────────────────────────────

export function AppTabs({
  value,
  onValueChange,
  items,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: Array<{ value: string; label: React.ReactNode; content: React.ReactNode }>;
  className?: string;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
      className={cn("w-full", className)}
    >
      <Tabs.List className="flex items-center gap-1 border-b border-white/5">
        {items.map((it) => (
          <Tabs.Tab
            key={it.value}
            value={it.value}
            className="px-3 py-2 text-[13px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] data-[selected]:text-[color:var(--nafas-surface)] border-b-2 border-transparent data-[selected]:border-[color:var(--nafas-accent)] -mb-px transition-colors cursor-pointer"
          >
            {it.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {items.map((it) => (
        <Tabs.Panel key={it.value} value={it.value} className="pt-5 outline-none">
          {it.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Form atoms: Input, Textarea, Select, Toggle, Label, FormMessage
// ────────────────────────────────────────────────────────────────────────

export function FormLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-1.5"
    >
      {children}
    </label>
  );
}

export function FormMessage({
  error,
  help,
}: {
  error?: string | null;
  help?: string | null;
}) {
  if (error) {
    return <p className="mt-1.5 text-[12px] text-[color:var(--nafas-danger)]">{error}</p>;
  }
  if (help) {
    return <p className="mt-1.5 text-[12px] text-[color:var(--nafas-ink3)]/80">{help}</p>;
  }
  return null;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-9 px-3 rounded-md bg-[color:var(--nafas-bg)] border border-white/10",
          "text-[13.5px] text-[color:var(--nafas-surface)] placeholder:text-[color:var(--nafas-ink3)]/60",
          "focus:outline-none focus:border-[color:var(--nafas-accent)] focus:ring-2 focus:ring-[color:var(--nafas-accent)]/20",
          "aria-invalid:border-[color:var(--nafas-danger)] aria-invalid:ring-[color:var(--nafas-danger)]/20",
          "transition-colors",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[72px] px-3 py-2 rounded-md bg-[color:var(--nafas-bg)] border border-white/10",
        "text-[13.5px] text-[color:var(--nafas-surface)] placeholder:text-[color:var(--nafas-ink3)]/60",
        "focus:outline-none focus:border-[color:var(--nafas-accent)] focus:ring-2 focus:ring-[color:var(--nafas-accent)]/20",
        "transition-colors resize-y",
        className,
      )}
      {...props}
    />
  );
});

export function SelectField({
  value,
  onValueChange,
  options,
  placeholder = "Choisir…",
  className,
}: {
  value: string | null | undefined;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <BaseSelect.Root
      value={value ?? ""}
      onValueChange={(v) => onValueChange(String(v))}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
    >
      <BaseSelect.Trigger
        className={cn(
          "w-full h-9 px-3 rounded-md bg-[color:var(--nafas-bg)] border border-white/10",
          "flex items-center justify-between gap-2 text-[13.5px] text-left",
          "focus:outline-none focus:border-[color:var(--nafas-accent)] focus:ring-2 focus:ring-[color:var(--nafas-accent)]/20",
          "transition-colors",
          className,
        )}
      >
        <BaseSelect.Value placeholder={placeholder}>
          {(v) => {
            const opt = options.find((o) => o.value === v);
            return opt?.label ?? <span className="text-[color:var(--nafas-ink3)]/70">{placeholder}</span>;
          }}
        </BaseSelect.Value>
        <span className="text-[10px] text-[color:var(--nafas-ink3)]">▾</span>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-[120] outline-none" sideOffset={4}>
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] rounded-md border border-white/10 bg-[color:var(--nafas-bg2)] shadow-[0_20px_48px_-12px_rgba(0,0,0,0.8)] py-1 max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <BaseSelect.Item
                key={opt.value}
                value={opt.value}
                className="px-3 py-1.5 text-[13px] cursor-pointer data-[highlighted]:bg-white/5 data-[selected]:text-[color:var(--nafas-accent2)] outline-none"
              >
                <BaseSelect.ItemText>{opt.label}</BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

export function ToggleField({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border border-white/10",
          "bg-white/5 data-[checked]:bg-[color:var(--nafas-accent)]/80 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nafas-accent)]/30",
        )}
      >
        <Switch.Thumb className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform data-[checked]:translate-x-4" />
      </Switch.Root>
      {label ? <span className="text-[13px] text-[color:var(--nafas-surface)]">{label}</span> : null}
    </label>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
    lg: "h-10 px-4 text-[14px]",
  }[size];
  const variants = {
    primary:
      "bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium disabled:opacity-50",
    secondary:
      "bg-white/5 hover:bg-white/10 text-[color:var(--nafas-surface)] border border-white/10",
    ghost:
      "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5",
    outline:
      "border border-white/15 text-[color:var(--nafas-surface)] hover:bg-white/5",
    danger:
      "bg-[color:var(--nafas-danger)]/15 hover:bg-[color:var(--nafas-danger)]/25 text-[color:var(--nafas-danger)] border border-[color:var(--nafas-danger)]/30",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nafas-accent)]/40",
        "disabled:pointer-events-none disabled:opacity-50",
        sizes,
        variants,
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "amber" | "danger" | "blue" | "cyan";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/5 text-[color:var(--nafas-ink3)] border-white/10",
    accent: "bg-[color:var(--nafas-accent)]/12 text-[color:var(--nafas-accent2)] border-[color:var(--nafas-accent)]/25",
    amber: "bg-[color:var(--nafas-amber)]/12 text-[color:var(--nafas-amber)] border-[color:var(--nafas-amber)]/25",
    danger: "bg-[color:var(--nafas-danger)]/12 text-[color:var(--nafas-danger)] border-[color:var(--nafas-danger)]/25",
    blue: "bg-[color:var(--nafas-blue)]/12 text-[color:var(--nafas-blue)] border-[color:var(--nafas-blue)]/25",
    cyan: "bg-[color:var(--nafas-cyan)]/12 text-[color:var(--nafas-cyan)] border-[color:var(--nafas-cyan)]/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.12em] uppercase border",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// Small div for section headers ("eyebrow") matching landing's tone
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
