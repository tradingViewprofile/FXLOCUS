"use client";

import React from "react";
import { Check, Copy, ImageUp, Send, Smile } from "lucide-react";

import { PreviewModal } from "@/components/system/PreviewModal";
import { dispatchSystemRealtime } from "@/lib/system/realtime";

type Recipient = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  support_name?: string | null;
};

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content_type: string;
  content_text: string | null;
  image_url: string | null;
  image_name: string | null;
  image_mime_type: string | null;
  image_size_bytes: number | null;
  created_at: string;
  read_at?: string | null;
};

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "🙄",
  "😬",
  "🥴",
  "🤐",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👿",
  "👹",
  "👺",
  "💀",
  "👻",
  "👽",
  "🤖",
  "💩",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
  "👋",
  "🤚",
  "✋",
  "🖐️",
  "🖖",
  "👌",
  "🤏",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "🤙",
  "👈",
  "👉",
  "👆",
  "🖕",
  "👇",
  "☝️",
  "👍",
  "👎",
  "✊",
  "👊",
  "🤛",
  "🤜",
  "👏",
  "🙌",
  "👐",
  "🤲",
  "🤝",
  "🙏",
  "💪",
  "🦾",
  "🫶",
  "🫵",
  "🫰",
  "✍️",
  "🤳",
  "👂",
  "👃",
  "👀",
  "🧠",
  "🦴",
  "🦷",
  "👄",
  "💋",
  "🐱",
  "🐈",
  "🐈‍⬛",
  "🐾",
  "🧶",
  "🐶",
  "🐕",
  "🐕‍🦺",
  "🐩",
  "🦊",
  "🐻",
  "🐻‍❄️",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐵",
  "🙈",
  "🙉",
  "🙊",
  "🐸",
  "🐔",
  "🐧",
  "🐦",
  "🐤",
  "🦆",
  "🦅",
  "🦉",
  "🐟",
  "🐬",
  "🐳",
  "🐢",
  "🦋",
  "🐞",
  "🐝",
  "🪲",
  "🪳",
  "🍎",
  "🍊",
  "🍋",
  "🍓",
  "🍇",
  "🍒",
  "🍉",
  "🍌",
  "🍔",
  "🍟",
  "🍕",
  "🌮",
  "🍣",
  "🍩",
  "🍪",
  "☕",
  "🧋",
  "🎉",
  "✨",
  "💡"
];

const RECENT_EMOJI_KEY = "fxlocus_consult_emoji_recent";
const EMOJI_PAGE_SIZE = 32;
const RECENT_LIMIT = 24;
const DEFAULT_RECENTS = EMOJIS.slice(0, 20);

type EmojiTab = "recent" | "all";

function safeStorageGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeEmojiList(list: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  list.forEach((emoji) => {
    if (!EMOJIS.includes(emoji)) return;
    if (seen.has(emoji)) return;
    seen.add(emoji);
    output.push(emoji);
  });
  return output;
}

function formatTime(value: string, locale: "zh" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function roleLabel(role: string | null, locale: "zh" | "en") {
  const key = String(role || "");
  if (locale === "zh") {
    if (key === "student") return "学员";
    if (key === "trader") return "交易员";
    if (key === "coach") return "教练";
    if (key === "assistant") return "助教";
    if (key === "leader") return "团队长";
    if (key === "super_admin") return "超管";
    return "其他";
  }
  if (key === "student") return "Student";
  if (key === "trader") return "Trader";
  if (key === "coach") return "Coach";
  if (key === "assistant") return "Assistant";
  if (key === "leader") return "Leader";
  if (key === "super_admin") return "Super admin";
  return "Other";
}

function isEmojiOnly(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const hasEmoji = /[\p{Extended_Pictographic}]/u.test(trimmed);
  if (!hasEmoji) return false;
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\u200d\uFE0F\s]+$/u.test(
    trimmed
  );
}

export function ConsultClient({ locale }: { locale: "zh" | "en" }) {
  const [meId, setMeId] = React.useState("");
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [unreadByPeer, setUnreadByPeer] = React.useState<Record<string, number>>({});
  const [latestByPeer, setLatestByPeer] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [loadingRecipients, setLoadingRecipients] = React.useState(true);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [error, setError] = React.useState("");
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [recallingId, setRecallingId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [emojiTab, setEmojiTab] = React.useState<EmojiTab>("recent");
  const [emojiPage, setEmojiPage] = React.useState(1);
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>(DEFAULT_RECENTS);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [pinnedPeers, setPinnedPeers] = React.useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{
    name: string;
    url: string | null;
    mimeType: string | null;
  } | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const selectedRef = React.useRef(selectedId);
  const sendingRef = React.useRef(false);
  const unreadInitRef = React.useRef(false);
  const unreadPrevRef = React.useRef<Record<string, number>>({});
  const audioRef = React.useRef<AudioContext | null>(null);
  const copyTimerRef = React.useRef<number | null>(null);
  const lastMessageAtRef = React.useRef<string | null>(null);
  const stickToBottomRef = React.useRef(true);
  const lastScrollTopRef = React.useRef(0);

  const getStorageValue = React.useCallback((key: string) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const setStorageValue = React.useCallback((key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  React.useEffect(() => {
    const stored = safeStorageGet(RECENT_EMOJI_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const normalized = normalizeEmojiList(parsed);
        if (normalized.length) setRecentEmojis(normalized);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    const container = document.querySelector(".system-main > .flex-1");
    if (!container) return;
    container.classList.add("system-consult-no-scroll");
    document.documentElement.classList.add("system-consult-lock");
    document.body.classList.add("system-consult-lock");
    return () => {
      container.classList.remove("system-consult-no-scroll");
      document.documentElement.classList.remove("system-consult-lock");
      document.body.classList.remove("system-consult-lock");
    };
  }, []);

  React.useEffect(() => {
    const content = document.querySelector(".system-content");
    if (!content) return;
    content.classList.add("system-consult-content");
    return () => {
      content.classList.remove("system-consult-content");
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && json?.ok) setMeId(String(json.user?.id || ""));
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!meId) return;
    const key = `fxlocus_consult_pins_${meId}`;
    const stored = safeStorageGet(key);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setPinnedPeers(new Set(parsed.map(String)));
      }
    } catch {
      // ignore
    }
  }, [meId]);

  React.useEffect(() => {
    if (!meId) return;
    const key = `fxlocus_consult_pins_${meId}`;
    safeStorageSet(key, JSON.stringify(Array.from(pinnedPeers)));
  }, [meId, pinnedPeers]);

  const loadRecipients = React.useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch("/api/system/consult/recipients");
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items) ? json.items : [];
      setRecipients(items);
      // defer selection until latest message map is available
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  const playNotificationSound = React.useCallback(() => {
    try {
      const AudioContextCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx: AudioContext = audioRef.current || new AudioContextCtor();
      audioRef.current = ctx;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.06;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }, []);

  const loadUnreadCounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/system/consult/unread-by-peer");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;
      const counts = json?.counts || {};
      setUnreadByPeer(counts);
      setLatestByPeer(json?.latest || {});
      if (unreadInitRef.current) {
        const prev = unreadPrevRef.current || {};
        const increased = Object.keys(counts).some((key) => {
          const nextValue = Number(counts[key] || 0);
          const prevValue = Number(prev[key] || 0);
          return nextValue > prevValue;
        });
        if (increased) playNotificationSound();
      }
      unreadPrevRef.current = counts;
      unreadInitRef.current = true;
    } catch {
      // ignore
    }
  }, [playNotificationSound]);

  const loadMessages = React.useCallback(async (peerId: string, since?: string) => {
    if (!peerId) return;
    try {
      const params = new URLSearchParams({ peerId });
      if (since) params.set("since", since);
      const res = await fetch(`/api/system/consult/messages?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error || "load_failed");
        if (!since) setMessages([]);
        return;
      }
      const incoming: Message[] = Array.isArray(json.items) ? json.items : [];
      if (since) {
        if (incoming.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((msg) => msg.id));
            const merged = [...prev];
            incoming.forEach((msg: Message) => {
              if (!seen.has(msg.id)) merged.push(msg);
            });
            return merged;
          });
        }
      } else {
        setMessages(incoming);
      }
      if (incoming.length) {
        lastMessageAtRef.current = incoming[incoming.length - 1]?.created_at || lastMessageAtRef.current;
      }
    } catch {
      setError("load_failed");
    }
  }, []);

  const copyToClipboard = React.useCallback(async (value: string) => {
    if (!value) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // fall through to legacy method
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const copyMessage = React.useCallback(
    async (msg: Message) => {
      const text = msg.content_text?.trim() || msg.image_url || "";
      if (!text) return;
      const ok = await copyToClipboard(text);
      if (!ok) return;
      setCopiedId(msg.id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedId((prev) => (prev === msg.id ? null : prev));
        copyTimerRef.current = null;
      }, 1600);
    },
    [copyToClipboard]
  );

  React.useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  React.useEffect(() => {
    if (!meId || !selectedId) return;
    setStorageValue(`fxlocus_consult_last_${meId}`, selectedId);
  }, [meId, selectedId, setStorageValue]);

  React.useEffect(() => {
    if (!recipients.length || selectedId) return;
    const entries = Object.entries(latestByPeer || {});
    if (!entries.length) {
      if (meId) {
        const stored = safeStorageGet(`fxlocus_consult_last_${meId}`);
        if (stored && recipients.some((item) => item.id === stored)) {
          setSelectedId(stored);
          return;
        }
      }
      if (recipients[0]) setSelectedId(recipients[0].id);
      return;
    }
    const sorted = entries
      .filter(([id]) => recipients.some((item) => item.id === id))
      .sort((a, b) => String(b[1] || "").localeCompare(String(a[1] || "")));
    if (sorted.length) {
      setSelectedId(sorted[0][0]);
      return;
    }
    if (recipients[0]) setSelectedId(recipients[0].id);
  }, [latestByPeer, recipients, selectedId, meId]);

  React.useEffect(() => {
    loadUnreadCounts();
    const pollMs = typeof navigator !== "undefined" && (navigator as any).connection?.saveData ? 120_000 : 60_000;
    const id = window.setInterval(() => {
      if (!document.hidden) loadUnreadCounts();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [loadUnreadCounts]);

  React.useEffect(() => {
    if (!selectedId) return;
    setError("");
    lastMessageAtRef.current = null;
    void loadMessages(selectedId).finally(() => loadUnreadCounts());
    const pollMs = typeof navigator !== "undefined" && (navigator as any).connection?.saveData ? 90_000 : 45_000;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const since = lastMessageAtRef.current || undefined;
      void loadMessages(selectedId, since).finally(() => loadUnreadCounts());
    }, pollMs);
    return () => window.clearInterval(id);
  }, [loadMessages, loadUnreadCounts, selectedId]);

  // Supabase realtime removed after migrating away from Supabase.
  // We rely on polling in this screen (loadUnreadCounts/loadMessages intervals) + local in-app refresh events.

  React.useEffect(() => {
    if (!listRef.current) return;
    if (stickToBottomRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      lastScrollTopRef.current = listRef.current.scrollTop;
    }
  }, [messages, selectedId]);

  React.useEffect(() => {
    stickToBottomRef.current = true;
  }, [selectedId]);

  const filteredRecipients = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? recipients.filter((item) => {
        const name = `${item.full_name || ""} ${item.email || ""} ${roleLabel(item.role, locale)}`;
        return name.toLowerCase().includes(q);
      })
      : recipients;
    if (!base.length) return base;
    return base
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const pinA = pinnedPeers.has(a.item.id);
        const pinB = pinnedPeers.has(b.item.id);
        if (pinA !== pinB) return pinA ? -1 : 1;
        const timeA = latestByPeer[a.item.id] || "";
        const timeB = latestByPeer[b.item.id] || "";
        if (timeA !== timeB) return timeB.localeCompare(timeA);
        const countA = unreadByPeer[a.item.id] || 0;
        const countB = unreadByPeer[b.item.id] || 0;
        if (countA !== countB) return countB - countA;
        return a.idx - b.idx;
      })
      .map((row) => row.item);
  }, [query, recipients, locale, unreadByPeer, latestByPeer, pinnedPeers]);

  const activeRecipient = React.useMemo(
    () => recipients.find((item) => item.id === selectedId) || null,
    [recipients, selectedId]
  );

  const togglePin = React.useCallback((peerId: string) => {
    setPinnedPeers((prev) => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId);
      else next.add(peerId);
      return next;
    });
  }, []);

  const markUnread = React.useCallback(
    async (peerId: string) => {
      try {
        await fetch("/api/system/consult/mark-unread", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ peerId })
        });
        setUnreadByPeer((prev) => ({
          ...prev,
          [peerId]: Math.max(1, prev[peerId] || 0)
        }));
      } finally {
        loadUnreadCounts();
        dispatchSystemRealtime({ table: "consult_messages", action: "update" });
      }
    },
    [loadUnreadCounts]
  );

  const markRead = React.useCallback(
    async (peerId: string) => {
      try {
        await fetch("/api/system/consult/mark-read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ peerId })
        });
        setUnreadByPeer((prev) => ({ ...prev, [peerId]: 0 }));
      } finally {
        loadUnreadCounts();
        dispatchSystemRealtime({ table: "consult_messages", action: "update" });
      }
    },
    [loadUnreadCounts]
  );

  React.useEffect(() => {
    if (!contextMenu) return;
    const close = (event?: PointerEvent) => {
      if (event && event.button === 2) return;
      setContextMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  const totalEmojiPages = Math.max(1, Math.ceil(EMOJIS.length / EMOJI_PAGE_SIZE));
  const pagedEmojis = EMOJIS.slice(
    (emojiPage - 1) * EMOJI_PAGE_SIZE,
    emojiPage * EMOJI_PAGE_SIZE
  );
  const displayEmojis = emojiTab === "recent" ? (recentEmojis.length ? recentEmojis : DEFAULT_RECENTS) : pagedEmojis;

  const pushRecentEmoji = React.useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const next = normalizeEmojiList([emoji, ...prev]).slice(0, RECENT_LIMIT);
      safeStorageSet(RECENT_EMOJI_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const send = async () => {
    if (!selectedId) return;
    if (sendingRef.current) return;
    const payloadText = text.trim();
    if (!payloadText && !imageFile) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("toUserId", selectedId);
      if (payloadText) form.set("text", payloadText);
      if (imageFile) form.set("image", imageFile);
      const res = await fetch("/api/system/consult/send", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "send_failed");
      setText("");
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
        await loadMessages(selectedId);
        await loadUnreadCounts();
        dispatchSystemRealtime({ table: "consult_messages", action: "insert" });
      } catch (e: any) {
        setError(e?.message || "send_failed");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const recallMessage = React.useCallback(
    async (messageId: string) => {
      if (!messageId) return;
      setRecallingId(messageId);
      setError("");
      try {
        const res = await fetch("/api/system/consult/recall", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messageId })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "recall_failed");
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        await loadUnreadCounts();
        dispatchSystemRealtime({ table: "consult_messages", action: "delete" });
      } catch (e: any) {
        setError(e?.message || (locale === "zh" ? "撤回失败" : "Recall failed"));
      } finally {
        setRecallingId(null);
      }
    },
    [loadUnreadCounts, locale]
  );

  const onSelectRecipient = (id: string) => {
    setSelectedId(id);
    setEmojiOpen(false);
  };

  const onPickEmoji = (emoji: string) => {
    setText((prev) => `${prev}${emoji}`);
    pushRecentEmoji(emoji);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) {
        setImageFile(file);
        e.preventDefault();
        break;
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 w-full max-w-none flex-col gap-6 overflow-hidden">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "咨询" : "Consultation"}
        </div>
        <div className="mt-2 text-xs text-white/55">
          {locale === "zh"
            ? "仅可与可见范围内的团队长、教练、助教、学员或超管沟通。"
            : "Chat only with allowed leaders, coaches, assistants, students, or super admins."}
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3 flex flex-col min-h-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "zh" ? "搜索联系人..." : "Search contacts..."}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          />
          {loadingRecipients ? (
            <div className="text-xs text-white/50">
              {locale === "zh" ? "加载中..." : "Loading..."}
            </div>
          ) : null}
          {!loadingRecipients && filteredRecipients.length === 0 ? (
            <div className="text-xs text-white/50">
              {locale === "zh" ? "暂无可咨询对象" : "No available contacts"}
            </div>
          ) : null}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {filteredRecipients.map((item) => {
              const baseLabel = item.full_name || item.email || item.id.slice(0, 6);
              const supportLabel = item.support_name ? `（${item.support_name}）` : "";
              const label = `${baseLabel}${supportLabel}`;
              const active = item.id === selectedId;
              const unreadCount = unreadByPeer[item.id] || 0;
              const pinned = pinnedPeers.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectRecipient(item.id)}
                  onPointerDown={(event) => {
                    if (event.button !== 2) return;
                    event.preventDefault();
                    event.stopPropagation();
                    setContextMenu({ id: item.id, x: event.clientX, y: event.clientY });
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setContextMenu({ id: item.id, x: event.clientX, y: event.clientY });
                  }}
                  className={[
                    "w-full rounded-2xl border px-3 py-2 text-left transition",
                    active
                      ? "border-sky-400/50 bg-sky-400/10 text-white"
                      : pinned
                        ? "border-amber-400/40 bg-amber-400/10 text-white/80"
                        : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">
                      {item.avatar_url ? (
                        <img
                          src={item.avatar_url}
                          alt={label}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        label.slice(0, 1)
                      )}
                      {unreadCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-sm font-semibold truncate">{label}</div>
                        {pinned ? (
                          <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-100">
                            {locale === "zh" ? "置顶" : "Pin"}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-white/50">{roleLabel(item.role, locale)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {contextMenu ? (
          <div
            className="fixed z-50 min-w-[160px] rounded-2xl border border-white/10 bg-[#0b1222] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button
              type="button"
              onClick={() => {
                void markUnread(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              {locale === "zh" ? "标为未读" : "Mark unread"}
            </button>
            <button
              type="button"
              onClick={() => {
                void markRead(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
            >
              {locale === "zh" ? "取消未读" : "Mark read"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (pinnedPeers.has(contextMenu.id)) return;
                togglePin(contextMenu.id);
                setContextMenu(null);
              }}
              className={[
                "w-full rounded-xl px-3 py-2 text-left text-xs",
                pinnedPeers.has(contextMenu.id)
                  ? "text-white/35 cursor-not-allowed"
                  : "text-white/80 hover:bg-white/10"
              ].join(" ")}
            >
              {locale === "zh" ? "置顶" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!pinnedPeers.has(contextMenu.id)) return;
                togglePin(contextMenu.id);
                setContextMenu(null);
              }}
              className={[
                "w-full rounded-xl px-3 py-2 text-left text-xs",
                pinnedPeers.has(contextMenu.id)
                  ? "text-white/80 hover:bg-white/10"
                  : "text-white/35 cursor-not-allowed"
              ].join(" ")}
            >
              {locale === "zh" ? "取消置顶" : "Unpin"}
            </button>
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">
              {activeRecipient?.avatar_url ? (
                <img
                  src={activeRecipient.avatar_url}
                  alt={activeRecipient.full_name || ""}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                (activeRecipient?.full_name || activeRecipient?.email || "--").slice(0, 1)
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {activeRecipient?.full_name || activeRecipient?.email || (locale === "zh" ? "请选择" : "Select")}
              </div>
              <div className="text-xs text-white/50">
                {activeRecipient ? roleLabel(activeRecipient.role, locale) : ""}
              </div>
            </div>
          </div>

            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3 pr-1 consult-chat-scroll"
              onScroll={() => {
                const el = listRef.current;
                if (!el) return;
                const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                if (el.scrollTop < lastScrollTopRef.current - 2) {
                  stickToBottomRef.current = false;
                } else if (distance < 80) {
                  stickToBottomRef.current = true;
                }
                lastScrollTopRef.current = el.scrollTop;
              }}
            >
            {messages.length === 0 ? (
              <div className="text-xs text-white/50">
                {locale === "zh" ? "暂无消息" : "No messages yet"}
              </div>
            ) : null}
            {messages.map((msg) => {
              const mine = msg.from_user_id === meId;
              const emojiOnly = msg.content_text ? isEmojiOnly(msg.content_text) : false;
              const createdTs = Date.parse(msg.created_at);
              const canRecall =
                mine && Number.isFinite(createdTs) && Date.now() - createdTs <= 5 * 60 * 1000;
              const canCopy = Boolean((msg.content_text && msg.content_text.trim()) || msg.image_url);
              const copied = copiedId === msg.id;
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[70%] rounded-2xl border px-4 py-2 text-sm",
                      mine
                        ? "bg-sky-500/15 border-sky-400/30 text-sky-50"
                        : "bg-white/5 border-white/10 text-white/85"
                    ].join(" ")}
                  >
                    {msg.content_text ? (
                      <div
                        className={
                          emojiOnly
                            ? "whitespace-pre-wrap text-[42px] leading-[1.1]"
                            : "whitespace-pre-wrap break-words leading-6"
                        }
                      >
                        {msg.content_text}
                      </div>
                    ) : null}
                    {msg.image_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewFile({
                            name: msg.image_name || "image",
                            url: msg.image_url,
                            mimeType: msg.image_mime_type
                          })
                        }
                        className="mt-2 block cursor-zoom-in"
                      >
                        <img
                          src={msg.image_url}
                          alt={msg.image_name || "image"}
                          className="max-h-64 rounded-xl border border-white/10"
                        />
                      </button>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-white/45">
                      <span>{formatTime(msg.created_at, locale)}</span>
                      {mine ? (
                        <span>{msg.read_at ? (locale === "zh" ? "已读" : "Read") : locale === "zh" ? "未读" : "Unread"}</span>
                      ) : null}
                      <button
                        type="button"
                        disabled={!canCopy}
                        onClick={() => copyMessage(msg)}
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white/5",
                          canCopy ? "text-white/70 hover:text-white/90 hover:bg-white/10" : "cursor-not-allowed opacity-40"
                        ].join(" ")}
                        aria-label={
                          copied
                            ? locale === "zh"
                              ? "已复制"
                              : "Copied"
                            : locale === "zh"
                              ? "复制消息"
                              : "Copy message"
                        }
                        title={
                          copied
                            ? locale === "zh"
                              ? "已复制"
                              : "Copied"
                            : locale === "zh"
                              ? "复制"
                              : "Copy"
                        }
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      {canRecall ? (
                        <button
                          type="button"
                          disabled={recallingId === msg.id}
                          onClick={() => recallMessage(msg.id)}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10 disabled:opacity-50"
                        >
                          {locale === "zh" ? "撤回" : "Recall"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-3">
            {error ? <div className="text-xs text-rose-300 mb-2">{error}</div> : null}
            {imageFile ? (
              <div className="mb-2 flex items-center gap-2 text-xs text-white/60">
                <span>
                  {locale === "zh" ? "已选择图片：" : "Image selected:"} {imageFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                >
                  {locale === "zh" ? "移除" : "Remove"}
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEmojiOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                title={locale === "zh" ? "表情" : "Emoji"}
              >
                <Smile className="h-4 w-4" />
              </button>
              <label className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer">
                <ImageUp className="h-4 w-4" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                  }}
                />
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (sendingRef.current) {
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={locale === "zh" ? "输入消息..." : "Type a message..."}
                rows={1}
                className="flex-1 min-w-[200px] resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 leading-6 whitespace-pre-wrap break-words"
              />
              <button
                type="button"
                disabled={sending || (!text.trim() && !imageFile)}
                onClick={send}
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? (locale === "zh" ? "发送中" : "Sending") : locale === "zh" ? "发送" : "Send"}
              </button>
            </div>
            {emojiOpen ? (
              <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2 text-xs text-white/70">
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiTab("recent");
                      setEmojiPage(1);
                    }}
                    className={[
                      "px-2 py-1 rounded-lg border",
                      emojiTab === "recent"
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                        : "border-white/10 bg-white/5 text-white/60"
                    ].join(" ")}
                  >
                    {locale === "zh" ? "常用" : "Recent"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiTab("all");
                      setEmojiPage(1);
                    }}
                    className={[
                      "px-2 py-1 rounded-lg border",
                      emojiTab === "all"
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                        : "border-white/10 bg-white/5 text-white/60"
                    ].join(" ")}
                  >
                    {locale === "zh" ? "全部" : "All"}
                  </button>
                  {emojiTab === "all" ? (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEmojiPage((p) => Math.max(1, p - 1))}
                        disabled={emojiPage <= 1}
                        className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
                      >
                        {locale === "zh" ? "上一页" : "Prev"}
                      </button>
                      <span className="text-white/60">
                        {emojiPage}/{totalEmojiPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEmojiPage((p) => Math.min(totalEmojiPages, p + 1))}
                        disabled={emojiPage >= totalEmojiPages}
                        className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
                      >
                        {locale === "zh" ? "下一页" : "Next"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-8 gap-1">
                  {displayEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onPickEmoji(emoji)}
                      className="h-8 w-8 rounded-lg hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <PreviewModal file={previewFile} locale={locale} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
