export async function copyToClipboard(text: string): Promise<void> {
  // Prefer the async clipboard API, but iOS Safari rejects writeText in
  // several real-world cases (focus changes, permission quirks). Fall back
  // to the legacy execCommand path instead of failing silently.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    const ok = document.execCommand("copy");
    if (!ok) throw new Error("execCommand copy failed");
  } finally {
    document.body.removeChild(textarea);
  }
}
