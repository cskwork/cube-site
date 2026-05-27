type Attrs = Record<string, string | number | boolean | null | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | false | undefined)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "string") {
      // ignore — handled by direct assignment in callers
    } else if (k === "for") node.setAttribute("for", String(v));
    else if (typeof v === "boolean") node.toggleAttribute(k, v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function on(
  target: EventTarget,
  type: string,
  handler: (ev: Event) => void,
  opts?: AddEventListenerOptions
): () => void {
  target.addEventListener(type, handler, opts);
  return () => target.removeEventListener(type, handler, opts);
}

export function debounce<T extends (...a: never[]) => void>(fn: T, ms: number): T {
  let t: number | undefined;
  return ((...args: never[]) => {
    if (t !== undefined) clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  }) as T;
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); resolve(); }
    catch (e) { reject(e); }
    finally { ta.remove(); }
  });
}
