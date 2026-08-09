"use client";

/**
 * Deliberately lightweight: a plain textarea rather than a WYSIWYG
 * library (Tiptap/Quill/etc.), to avoid an unjustified new dependency
 * (development_rules.md — "do not add dependencies without approval").
 * Content is sanitized server-side by StoryService before every write
 * regardless of what produced it, so this can be swapped for a real
 * WYSIWYG editor later without touching the Service/Schema layer.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={12}
      placeholder="Write your story… basic HTML (p, strong, em, headings, lists, links, images) is supported and sanitized on save."
      className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
    />
  );
}