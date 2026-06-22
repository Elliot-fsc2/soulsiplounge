import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type {
  AdminTab, BankAccount, Booking, BookingDraft, BookingStatus, ContactDraft, ContactMessage, ContactStatus,
  Duration, Payment, RoomItem, RoomPricingTier, Settings, ToastItem, ToastTone, View, Voucher, VoucherType,
} from "./lib/types";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import * as db from "./lib/db";
import { uploadRoomImage, uploadReceiptImage, uploadQrImage } from "./lib/storage";

const STORAGE_KEYS = {
  bookings: "soul-bookings",
  contacts: "soul-contacts",
  settings: "soul-settings",
  vouchers: "soul-vouchers",
  payments: "soul-payments",
  bankAccounts: "soul-bank-accounts",
};

// ---------- Pricing data exactly from the provided image ----------
const havenPricing: RoomPricingTier[] = [
  {
    duration: "1.5",
    withCake: false,
    perPersonRates: { 3: 1050, 4: 840, 5: 714, 6: 630, 7: 570, 8: 525, 9: 490, 10: 462, 11: 439, 12: 420 },
  },
  {
    duration: "1.5",
    withCake: true,
    perPersonRates: { 3: 1553, 4: 1301, 5: 1150, 6: 1049, 7: 977, 8: 936, 9: 882, 10: 848, 11: 821, 12: 798 },
  },
  {
    duration: "2",
    withCake: false,
    perPersonRates: { 3: 1330, 4: 1050, 5: 882, 6: 770, 7: 690, 8: 630, 9: 583, 10: 546, 11: 515, 12: 490 },
  },
  {
    duration: "2",
    withCake: true,
    perPersonRates: { 3: 1833, 4: 1511, 5: 1318, 6: 1189, 7: 1097, 8: 1029, 9: 975, 10: 932, 11: 897, 12: 868 },
  },
  {
    duration: "3",
    withCake: false,
    perPersonRates: { 3: 1925, 4: 1496, 5: 1239, 6: 1067, 7: 945, 8: 853, 9: 782, 10: 725, 11: 678, 12: 639 },
  },
  {
    duration: "3",
    withCake: true,
    perPersonRates: { 3: 2428, 4: 1957, 5: 1675, 6: 1487, 7: 1352, 8: 1252, 9: 1173, 10: 1111, 11: 1059, 12: 1016 },
  },
];

const defaultRooms: RoomItem[] = [
  {
    id: "rm_haven",
    name: "The Haven Room",
    image:
      "https://images.pexels.com/photos/14025910/pexels-photo-14025910.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    description:
      "A private function room perfect for intimate gatherings, birthdays, and small group celebrations with full catering setup.",
    minGroup: 3,
    maxGroup: 12,
    pricing: havenPricing,
  },
];

const defaultSettings: Settings = {
  businessName: "Soul Sips Lounge",
  tagline: "Sip. Gather. Celebrate. Your private haven awaits.",
  description:
    "A beautifully designed private room for gatherings of 3 to 12 guests. Choose your preferred duration and add a cake for a complete celebration package. Rates are per person.",
  address: "My Ville Co Living 24 Ortigas Avenue Extension Barangay Rosario Pasig City 2nd floor",
  phone: "0917 716 8618",
  email: "soulsipslounge@gmail.com",
  hours: "Daily: 11:00 AM – 11:00 PM",
  responseTime: "Reservations are confirmed within 1 hour.",
  rooms: defaultRooms,
  adminPassword: "admin123",
};

const defaultVouchers: Voucher[] = [
  {
    id: "vc_welcome",
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    minPurchase: 2000,
    maxUses: 100,
    usedCount: 0,
    expiresAt: "2026-12-31",
    active: true,
    description: "New customer welcome discount — 10% off",
    createdAt: new Date().toISOString(),
  },
  {
    id: "vc_birthday",
    code: "BIRTHDAY20",
    type: "percentage",
    value: 20,
    minPurchase: 5000,
    maxUses: 50,
    usedCount: 0,
    expiresAt: "2026-12-31",
    active: true,
    description: "Birthday bash special — 20% off for groups of 8+",
    createdAt: new Date().toISOString(),
  },
  {
    id: "vc_fixed",
    code: "SOUL500",
    type: "fixed",
    value: 500,
    minPurchase: 3000,
    maxUses: 30,
    usedCount: 0,
    expiresAt: "2026-09-30",
    active: true,
    description: "Flat ₱500 off your reservation",
    createdAt: new Date().toISOString(),
  },
];

const defaultBankAccounts: BankAccount[] = [
  {
    id: "ba_bpi",
    bankName: "BPI",
    accountName: "Soul Sips Lounge",
    accountNumber: "1234-5678-90",
    qrCodeUrl: "",
    isActive: true,
  },
  {
    id: "ba_bdo",
    bankName: "BDO",
    accountName: "Soul Sips Lounge",
    accountNumber: "9876-5432-10",
    qrCodeUrl: "",
    isActive: true,
  },
];

const defaultBookings: Booking[] = [
  {
    id: "bk_1001",
    name: "Maria Santos",
    email: "maria@example.com",
    phone: "+63 917 555 0118",
    roomName: "The Haven Room",
    guestCount: 6,
    duration: "2",
    withCake: true,
    date: "2026-06-12",
    time: "15:00",
    perPersonPrice: 1189,
    totalPrice: 7134,
    voucherCode: "WELCOME10",
    discountAmount: 713,
    finalPrice: 6421,
    status: "Confirmed",
    notes: "Birthday celebration for her daughter.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bk_1002",
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: "+63 928 555 0137",
    roomName: "The Haven Room",
    guestCount: 4,
    duration: "3",
    withCake: false,
    date: "2026-06-18",
    time: "16:30",
    perPersonPrice: 1496,
    totalPrice: 5984,
    voucherCode: "",
    discountAmount: 0,
    finalPrice: 5984,
    status: "Pending",
    notes: "Needs extra chairs setup.",
    createdAt: new Date().toISOString(),
  },
];

const defaultContacts: ContactMessage[] = [
  {
    id: "ct_2001",
    name: "Avery Brooks",
    email: "avery@example.com",
    phone: "+63 917 555 0192",
    subject: "Group of 15 inquiry",
    message: "Hi! Can we accommodate 15 people? Would love to book the room.",
    status: "New",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ct_2002",
    name: "Sofia Nguyen",
    email: "sofia@example.com",
    phone: "+63 928 555 0146",
    subject: "Cake customization",
    message: "Do you offer specific cake flavors? We'd like a chocolate fudge for our party.",
    status: "Read",
    createdAt: new Date().toISOString(),
  },
];

const bookingDefaults: BookingDraft = {
  name: "",
  email: "",
  phone: "",
  roomId: "",
  roomName: "",
  guestCount: 4,
  duration: "2",
  withCake: false,
  date: "",
  time: "13:00",
  voucherCode: "",
  appliedDiscount: 0,
  status: "Pending",
  notes: "",
};

const contactDefaults: ContactDraft = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

// ---------- Utilities ----------
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date);
}
function formatTime(value: string) {
  if (!value) return "No time";
  const [h, m] = value.split(":");
  const hour = Number(h);
  const label = hour >= 12 ? "PM" : "AM";
  return `${((hour + 11) % 12) + 1}:${m} ${label}`;
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH")}`;
}

/** Compute per-person rate from a room's pricing matrix. Returns 0 if no match. */
function computePerPersonRate(room: RoomItem | undefined, duration: Duration, withCake: boolean, guestCount: number): number {
  if (!room) return 0;
  const tier = room.pricing.find((p) => p.duration === duration && p.withCake === withCake);
  if (!tier) return 0;
  return tier.perPersonRates[guestCount] ?? 0;
}

const MAINTENANCE_INTERVAL = 5;

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function addMinutesToTime(time: string, minutes: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const clamped = ((total % 1440) + 1440) % 1440;
  const newH = Math.floor(clamped / 60);
  const newM = clamped % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function getEndTime(startTime: string, duration: Duration): string {
  return addMinutesToTime(startTime, parseFloat(duration) * 60);
}

function getTimeRangeDisplay(startTime: string, duration: Duration): string {
  if (!startTime) return "";
  return `${formatTime(startTime)} → ${formatTime(getEndTime(startTime, duration))}`;
}

function isSlotAvailable(
  date: string, roomName: string, startTime: string, duration: Duration,
  bookings: Booking[], editingId?: string
): { available: boolean; conflicting?: Booking } {
  if (!date || !roomName || !startTime) return { available: true };
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(getEndTime(startTime, duration));
  for (const b of bookings) {
    if (b.date !== date || b.roomName !== roomName) continue;
    if (editingId && b.id === editingId) continue;
    const existingStart = timeToMinutes(b.time);
    const existingEnd = timeToMinutes(getEndTime(b.time, b.duration));
    if (newStart < existingEnd + MAINTENANCE_INTERVAL && (newEnd + MAINTENANCE_INTERVAL) > existingStart) {
      return { available: false, conflicting: b };
    }
  }
  return { available: true };
}

// Operating hours range (10:00 AM – 10:00 PM)
const OPENING_MINUTES = 10 * 60;   // 600
const CLOSING_MINUTES = 22 * 60;  // 1320

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function generateAvailableSlots(
  date: string,
  roomName: string,
  duration: Duration,
  bookings: Booking[],
  editingId?: string,
): string[] {
  if (!date || !roomName) return [];
  const durationMin = parseFloat(duration) * 60;
  const lastStart = CLOSING_MINUTES - durationMin - MAINTENANCE_INTERVAL;
  const isToday = date === todayStr();
  const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
  const slots: string[] = [];
  for (let m = OPENING_MINUTES; m <= lastStart; m += 5) {
    if (isToday && m <= nowMinutes) continue;
    const timeStr = minutesToTime(m);
    const { available } = isSlotAvailable(date, roomName, timeStr, duration, bookings, editingId);
    if (available) slots.push(timeStr);
  }
  return slots;
}

function isDateFullyBooked(date: string, roomName: string, bookings: Booking[]): boolean {
  if (!date || !roomName) return false;
  for (const d of ["1.5", "2", "3"] as Duration[]) {
    if (generateAvailableSlots(date, roomName, d, bookings).length > 0) return false;
  }
  return true;
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect fill='%2327272a' width='120' height='80'/%3E%3Ctext x='60' y='44' text-anchor='middle' fill='%2371717a' font-size='10' font-family='sans-serif'%3ENo photo%3C/text%3E%3C/svg%3E";

function getToneClasses(tone: ToastTone) {
  if (tone === "success") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-50";
  if (tone === "warning") return "border-amber-400/30 bg-amber-500/15 text-amber-50";
  return "border-sky-400/30 bg-sky-500/15 text-sky-50";
}

// ===================================================================
// APP
// ===================================================================
// ── Apply a voucher and return { discount, finalPrice, valid, message } ────────
function applyVoucher(voucherCode: string, vouchers: Voucher[], totalAmount: number) {
  if (!voucherCode.trim()) return { discount: 0, finalPrice: totalAmount, valid: false, message: "" };
  const code = voucherCode.trim().toUpperCase();
  const voucher = vouchers.find((v) => v.code.toUpperCase() === code);
  if (!voucher) return { discount: 0, finalPrice: totalAmount, valid: false, message: "Voucher code not found." };
  if (!voucher.active) return { discount: 0, finalPrice: totalAmount, valid: false, message: "This voucher is no longer active." };
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return { discount: 0, finalPrice: totalAmount, valid: false, message: `This voucher expired on ${formatDate(voucher.expiresAt)}.` };
  if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses) return { discount: 0, finalPrice: totalAmount, valid: false, message: "This voucher has reached its usage limit." };
  if (totalAmount < voucher.minPurchase) return { discount: 0, finalPrice: totalAmount, valid: false, message: `Minimum purchase of ${formatCurrency(voucher.minPurchase)} required.` };

  const discount = voucher.type === "percentage" ? Math.round((totalAmount * voucher.value) / 100) : Math.min(voucher.value, totalAmount);
  return { discount, finalPrice: Math.max(0, totalAmount - discount), valid: true, message: `✓ ${voucher.code} applied — ${formatCurrency(discount)} off!` };
}

function App() {
  const [view, setViewState] = useState<View>(() => {
    const saved = sessionStorage.getItem("soul-view") as View | null;
    return saved || "home";
  });
  const setView = (v: View) => { sessionStorage.setItem("soul-view", v); setViewState(v); };

  const [adminTab, setAdminTabState] = useState<AdminTab>(() => {
    const saved = sessionStorage.getItem("soul-adminTab") as AdminTab | null;
    return saved || "bookings";
  });
  const setAdminTab = (t: AdminTab) => { sessionStorage.setItem("soul-adminTab", t); setAdminTabState(t); };

  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [pwAdminLoggedIn, setPwAdminLoggedIn] = useState(false);
  const isAdminLoggedIn = isSupabaseConfigured ? session : pwAdminLoggedIn;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(bookingDefaults);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(contactDefaults);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [isFrontDeskOpen, setIsFrontDeskOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomDraft, setRoomDraft] = useState<RoomItem | null>(null);
  const [voucherFeedback, setVoucherFeedback] = useState<{ message: string; valid: boolean }>({ message: "", valid: false });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingPaymentBookingId, setPendingPaymentBookingId] = useState<string | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Load data on mount ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (!isSupabaseConfigured) {
          setBookings(readStorage(STORAGE_KEYS.bookings, defaultBookings));
          setContacts(readStorage(STORAGE_KEYS.contacts, defaultContacts));
          const stored = readStorage(STORAGE_KEYS.settings, defaultSettings);
          stored.address = defaultSettings.address;
          stored.phone = defaultSettings.phone;
          stored.email = defaultSettings.email;
          setSettings(stored);
          localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(stored));
          setVouchers(readStorage(STORAGE_KEYS.vouchers, defaultVouchers));
          setPayments(readStorage(STORAGE_KEYS.payments, []));
          setBankAccounts(readStorage(STORAGE_KEYS.bankAccounts, defaultBankAccounts));
        } else {
          await db.seedDefaults(defaultBookings, defaultContacts, defaultSettings, defaultVouchers);
          const [b, c, s, v, p, ba] = await Promise.all([
            db.fetchBookings(),
            db.fetchContacts(),
            db.fetchSettings(),
            db.fetchVouchers(),
            db.fetchPayments(),
            db.fetchBankAccounts(),
          ]);
          setBookings(b);
          setContacts(c);
          setSettings(s ?? defaultSettings);
          setVouchers(v);
          setPayments(p);
          setBankAccounts(ba.length > 0 ? ba : defaultBankAccounts);
        }
      } catch {
        setBookings(readStorage(STORAGE_KEYS.bookings, defaultBookings));
        setContacts(readStorage(STORAGE_KEYS.contacts, defaultContacts));
        const stored = readStorage(STORAGE_KEYS.settings, defaultSettings);
        stored.address = defaultSettings.address;
        stored.phone = defaultSettings.phone;
        stored.email = defaultSettings.email;
        setSettings(stored);
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(stored));
        setVouchers(readStorage(STORAGE_KEYS.vouchers, defaultVouchers));
        setPayments(readStorage(STORAGE_KEYS.payments, []));
        setBankAccounts(readStorage(STORAGE_KEYS.bankAccounts, defaultBankAccounts));
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  // ── Supabase Auth session tracking ─────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); });
    return () => subscription.unsubscribe();
  }, []);

  // ── Persist to localStorage when Supabase is not configured ─────
  const syncLocalStorage = !isSupabaseConfigured;
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.bookings, bookings); }, [bookings, syncLocalStorage]);
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.contacts, contacts); }, [contacts, syncLocalStorage]);
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.settings, settings); }, [settings, syncLocalStorage]);
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.vouchers, vouchers); }, [vouchers, syncLocalStorage]);
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.payments, payments); }, [payments, syncLocalStorage]);
  useEffect(() => { if (syncLocalStorage) writeStorage(STORAGE_KEYS.bankAccounts, bankAccounts); }, [bankAccounts, syncLocalStorage]);

  const addToast = (title: string, description?: string, tone: ToastTone = "success") => {
    const id = createId("toast");
    setToasts((cur) => [...cur, { id, title, description, tone }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3200);
  };

  const bookingList = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const first = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const second = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return second - first;
      }),
    [bookings]
  );

  const contactList = useMemo(
    () =>
      [...contacts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).reverse(),
    [contacts]
  );

  const submitBooking = async (values: BookingDraft, source: "public" | "admin") => {
    const room = settings.rooms.find((r) => r.id === values.roomId) || settings.rooms.find((r) => r.name === values.roomName) || settings.rooms[0];
    const roomName = room?.name || "";
    const perPerson = computePerPersonRate(room, values.duration, values.withCake, values.guestCount);
    const total = perPerson * values.guestCount;
    const { discount, finalPrice } = applyVoucher(values.voucherCode, vouchers, total);

    // Operating hours & date validation
    if (values.date < todayStr()) {
      addToast("Invalid date", "Past dates cannot be booked.", "warning");
      return;
    }
    const timeMinutes = timeToMinutes(values.time);
    if (timeMinutes < OPENING_MINUTES) {
      addToast("Too early", "Start time must be 10:00 AM or later.", "warning");
      return;
    }
    const durationMinutes = parseFloat(values.duration) * 60;
    if (timeMinutes > CLOSING_MINUTES - durationMinutes) {
      addToast("Too late", `Latest start time for ${values.duration}-hour session is ${formatTime(minutesToTime(CLOSING_MINUTES - durationMinutes))}.`, "warning");
      return;
    }
    if (isDateFullyBooked(values.date, roomName, bookings)) {
      addToast("Fully booked", "This date has no available slots. Please choose another date.", "warning");
      return;
    }

    // Frontend slot check (fast, immediate feedback, using resolved roomName)
    const slotCheck = isSlotAvailable(values.date, roomName, values.time, values.duration, bookings, editingBookingId ?? undefined);
    if (!slotCheck.available) {
      addToast("Time conflict", `This slot conflicts with ${slotCheck.conflicting?.name ?? "another booking"}.`, "warning");
      return;
    }

    // Server-side slot validation (authoritative, enforces 5-min maintenance buffer)
    if (isSupabaseConfigured) {
      try {
        const dbCheck = await db.checkSlotAvailable(values.date, roomName, values.time, values.duration, editingBookingId ?? undefined);
        if (!dbCheck.available) {
          addToast("Time conflict", `This slot conflicts with ${dbCheck.conflicting?.name ?? "another booking"}.`, "warning");
          return;
        }
      } catch {
        // RPC not available — fall through; frontend check is sufficient
      }
    }

    const nextBooking: Booking = {
      id: source === "admin" && editingBookingId ? editingBookingId : createId("bk"),
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      roomName: values.roomName || settings.rooms[0]?.name || "The Haven Room",
      guestCount: values.guestCount,
      duration: values.duration,
      withCake: values.withCake,
      date: values.date,
      time: values.time,
      perPersonPrice: perPerson,
      totalPrice: total,
      voucherCode: values.voucherCode.trim().toUpperCase(),
      discountAmount: discount,
      finalPrice,
      status: values.status,
      notes: values.notes.trim(),
      createdAt:
        source === "admin" && editingBookingId
          ? bookings.find((b) => b.id === editingBookingId)?.createdAt ?? new Date().toISOString()
          : new Date().toISOString(),
    };

    // Increment voucher usedCount if a valid voucher was applied
    if (discount > 0 && nextBooking.voucherCode) {
      setVouchers((cur) =>
        cur.map((v) => (v.code.toUpperCase() === nextBooking.voucherCode ? { ...v, usedCount: v.usedCount + 1 } : v))
      );
    }

    // Persist async
    db.upsertBooking(nextBooking).catch(() => {});

    if (source === "admin" && editingBookingId) {
      setBookings((cur) => cur.map((b) => (b.id === editingBookingId ? nextBooking : b)));
      setEditingBookingId(null);
      setBookingDraft(bookingDefaults);
      setVoucherFeedback({ message: "", valid: false });
      setIsFrontDeskOpen(false);
      addToast("Reservation updated", `${nextBooking.name} - ${formatCurrency(finalPrice)} total.`);
      setAdminTab("bookings");
      setView("admin");
      return;
    }

    setBookings((cur) => [nextBooking, ...cur]);
    setBookingDraft(bookingDefaults);
    setVoucherFeedback({ message: "", valid: false });
    if (source === "admin") setIsFrontDeskOpen(false);
    if (source === "public") {
      setPendingPaymentBookingId(nextBooking.id);
      setPaymentSubmitted(false);
      setView("payment");
    } else {
      addToast("Reservation registered", `${nextBooking.name} - ${nextBooking.guestCount} pax - ${formatCurrency(total)} total.`);
    }
  };

  const editBooking = (booking: Booking) => {
    setEditingBookingId(booking.id);
    const room = settings.rooms.find((r) => r.name === booking.roomName);
    setBookingDraft({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      roomId: room?.id || "",
      roomName: booking.roomName,
      guestCount: booking.guestCount,
      duration: booking.duration,
      withCake: booking.withCake,
      date: booking.date,
      time: booking.time,
      voucherCode: booking.voucherCode || "",
      appliedDiscount: booking.discountAmount,
      status: booking.status,
      notes: booking.notes,
    });
    setIsFrontDeskOpen(true);
    setAdminTab("bookings");
    setView("admin");
  };

  const deleteBooking = (id: string) => {
    const removed = bookings.find((b) => b.id === id);
    setBookings((cur) => cur.filter((b) => b.id !== id));
    db.deleteBooking(id).catch(() => {});
    if (editingBookingId === id) {
      setEditingBookingId(null);
      setBookingDraft(bookingDefaults);
      setVoucherFeedback({ message: "", valid: false });
    }
    if (removed) addToast("Reservation deleted", `${removed.name} was removed from the schedule.`, "warning");
  };

  // ── Voucher helpers ──────────────────────────────────────────────
  const handleApplyVoucher = (code: string, totalAmount: number) => {
    const result = applyVoucher(code, vouchers, totalAmount);
    setVoucherFeedback({ message: result.message, valid: result.valid });
    if (result.valid) {
      setBookingDraft((prev) => ({ ...prev, voucherCode: code, appliedDiscount: result.discount }));
    } else {
      setBookingDraft((prev) => ({ ...prev, voucherCode: "", appliedDiscount: 0 }));
    }
  };

  const clearVoucher = () => {
    setBookingDraft((prev) => ({ ...prev, voucherCode: "", appliedDiscount: 0 }));
    setVoucherFeedback({ message: "", valid: false });
  };

  const handleUploadReceipt = async (bookingId: string, amount: number, file: File): Promise<void> => {
    const paymentId = createId("pmt");
    const { url: receiptUrl } = await uploadReceiptImage(file, paymentId);
    const now = new Date().toISOString();
    const payment: Payment = {
      id: paymentId,
      bookingId,
      amount,
      receiptUrl,
      status: "Pending",
      notes: "",
      paidAt: now,
      confirmedAt: "",
      createdAt: now,
    };
    setPayments((cur) => [payment, ...cur]);
    db.upsertPayment(payment).catch(() => {});
  };

  const handleConfirmPayment = (paymentId: string, bookingId: string) => {
    const now = new Date().toISOString();
    setPayments((cur) => cur.map((p) => (p.id === paymentId ? { ...p, status: "Confirmed", confirmedAt: now } : p)));
    setBookings((cur) => cur.map((b) => (b.id === bookingId ? { ...b, status: "Confirmed" } : b)));
    db.updatePaymentStatus(paymentId, "Confirmed", now).catch(() => {});
    db.upsertBooking(bookings.find((b) => b.id === bookingId) ?? ({} as Booking)).catch(() => {});
    addToast("Payment confirmed", "The booking has been confirmed.");
  };

  const handleCancelPayment = (paymentId: string) => {
    setPayments((cur) => cur.map((p) => (p.id === paymentId ? { ...p, status: "Cancelled", confirmedAt: new Date().toISOString() } : p)));
    db.updatePaymentStatus(paymentId, "Cancelled", new Date().toISOString()).catch(() => {});
    addToast("Payment cancelled", "The payment has been cancelled.", "warning");
  };

  const handleRefundPayment = (paymentId: string) => {
    setPayments((cur) => cur.map((p) => (p.id === paymentId ? { ...p, status: "Refunded", confirmedAt: new Date().toISOString() } : p)));
    db.updatePaymentStatus(paymentId, "Refunded", new Date().toISOString()).catch(() => {});
    addToast("Payment refunded", "The payment has been marked as refunded.", "info");
  };

  const handleBankAccountsChange = (accounts: BankAccount[]) => {
    setBankAccounts(accounts);
    accounts.forEach((acc) => db.upsertBankAccount(acc).catch(() => {}));
    const removed = bankAccounts.filter((a) => !accounts.find((na) => na.id === a.id));
    removed.forEach((a) => db.deleteBankAccount(a.id).catch(() => {}));
  };

  const generateVoucherCode = (prefix: string = "SOUL") => {
    const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${suffix}`;
  };

  const addVoucher = (voucher: Omit<Voucher, "id" | "usedCount" | "createdAt">) => {
    const newVoucher: Voucher = {
      ...voucher,
      code: voucher.code.toUpperCase(),
      id: createId("vc"),
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    setVouchers((cur) => [newVoucher, ...cur]);
    db.upsertVoucher(newVoucher).catch(() => {});
    addToast("Voucher created", `Code ${newVoucher.code} is now active.`);
  };

  const updateVoucher = (id: string, patch: Partial<Voucher>) => {
    setVouchers((cur) => cur.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    db.patchVoucher(id, patch).catch(() => {});
  };

  const deleteVoucher = (id: string) => {
    const removed = vouchers.find((v) => v.id === id);
    setVouchers((cur) => cur.filter((v) => v.id !== id));
    db.deleteVoucher(id).catch(() => {});
    if (removed) addToast("Voucher deleted", `Code ${removed.code} removed.`, "warning");
  };

  const submitContact = (values: ContactDraft) => {
    const next: ContactMessage = {
      id: createId("ct"),
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      subject: values.subject.trim(),
      message: values.message.trim(),
      status: "New",
      createdAt: new Date().toISOString(),
    };
    setContacts((cur) => [next, ...cur]);
    db.upsertContact(next).catch(() => {});
    setContactDraft(contactDefaults);
    addToast("Message sent", "Your inquiry has been added to our dashboard.");
  };

  const updateContactStatus = (id: string, status: ContactStatus) => {
    setContacts((cur) => cur.map((c) => (c.id === id ? { ...c, status } : c)));
    db.updateContactStatus(id, status).catch(() => {});
    addToast("Contact updated", `Status changed to ${status.toLowerCase()}.`, "info");
  };

  const deleteContact = (id: string) => {
    const removed = contacts.find((c) => c.id === id);
    setContacts((cur) => cur.filter((c) => c.id !== id));
    db.deleteContact(id).catch(() => {});
    if (removed) addToast("Contact removed", `${removed.name} was deleted.`, "warning");
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      setPwAdminLoggedIn(false);
    }
    setView("home");
  };

  const saveSettings = () => {
    db.saveSettings(settings).catch(() => {});
    addToast("Settings saved", `${settings.businessName} is updated across the site.`);
  };

  // ---------- Room CRUD ----------
  const startCreateRoom = () => {
    setEditingRoomId(null);
    setRoomDraft({
      id: createId("rm"),
      name: "New Room",
      image: "",
      description: "A newly added private room.",
      minGroup: 3,
      maxGroup: 12,
      pricing: havenPricing.map((t) => ({ ...t, perPersonRates: { ...t.perPersonRates } })),
    });
  };

  const startEditRoom = (room: RoomItem) => {
    setEditingRoomId(room.id);
    setRoomDraft({ ...room, pricing: room.pricing.map((t) => ({ ...t, perPersonRates: { ...t.perPersonRates } })) });
  };

  const saveRoomDraft = (room: RoomItem) => {
    setSettings((prev) => {
      const exists = prev.rooms.some((r) => r.id === room.id);
      const next = exists ? prev.rooms.map((r) => (r.id === room.id ? room : r)) : [...prev.rooms, room];
      return { ...prev, rooms: next };
    });
    db.saveRoom(room).catch(() => {});
    setEditingRoomId(null);
    setRoomDraft(null);
    addToast(editingRoomId ? "Room updated" : "Room created", `${room.name} has been saved.`);
  };

  const deleteRoom = (id: string) => {
    const removed = settings.rooms.find((r) => r.id === id);
    setSettings((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== id) }));
    db.deleteRoom(id).catch(() => {});
    if (removed) addToast("Room deleted", `${removed.name} was removed.`, "warning");
  };

  if (dataLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm text-stone-500">{dataLoading ? "Loading data..." : "Checking session..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SiteHeader businessName={settings.businessName} view={view} onNavigate={setView} onOpenAdmin={() => setView("admin")} />

      <AnimatePresence mode="wait">
        {view !== "admin" ? (
          <motion.main key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="relative">
            {view === "home" && <HomeView settings={settings} onNavigate={setView} />}
            {view === "booking" && <BookingPage settings={settings} rooms={settings.rooms} draft={bookingDraft} onChange={setBookingDraft} onSubmit={(v) => submitBooking(v, "public")} vouchers={vouchers} onApplyVoucher={handleApplyVoucher} onClearVoucher={clearVoucher} voucherFeedback={voucherFeedback} bookings={bookings} />}
            {view === "payment" && <PaymentPage bookings={bookings} pendingBookingId={pendingPaymentBookingId} bankAccounts={bankAccounts} paymentSubmitted={paymentSubmitted} onPaymentSubmitted={setPaymentSubmitted} onUploadReceipt={handleUploadReceipt} onNavigate={setView} />}
            {view === "contact" && <ContactPage settings={settings} draft={contactDraft} onChange={setContactDraft} onSubmit={submitContact} />}
          </motion.main>
        ) : !isAdminLoggedIn ? (
          <motion.main key="admin-login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="flex min-h-[calc(100vh-81px)] items-center justify-center px-4 py-12">
            {isSupabaseConfigured ? (
              <SupabaseLogin onCancel={() => setView("home")} />
            ) : (
              <AdminLogin correctPassword={settings.adminPassword ?? "admin123"} onLogin={() => { setPwAdminLoggedIn(true); addToast("Access granted", "Welcome to the admin dashboard."); }} onCancel={() => setView("home")} />
            )}
          </motion.main>
        ) : (
          <motion.main key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="min-h-screen bg-stone-950">
            <AdminPanel
              bookings={bookingList}
              contacts={contactList}
              payments={payments}
              bankAccounts={bankAccounts}
              settings={settings}
              rooms={settings.rooms}
              adminTab={adminTab}
              setAdminTab={setAdminTab}
              bookingDraft={bookingDraft}
              setBookingDraft={setBookingDraft}
              editingBookingId={editingBookingId}
              isFrontDeskOpen={isFrontDeskOpen}
              setIsFrontDeskOpen={setIsFrontDeskOpen}
              onSubmitBooking={(v) => submitBooking(v, "admin")}
              onEditBooking={editBooking}
              onDeleteBooking={deleteBooking}
              contactUpdateStatus={updateContactStatus}
              onDeleteContact={deleteContact}
              onSettingsChange={setSettings}
              onSaveSettings={saveSettings}
              onCloseAdmin={() => setView("home")}
              onSignOut={handleSignOut}
              onCancelBookingEdit={() => { setEditingBookingId(null); setBookingDraft(bookingDefaults); }}
              editingRoomId={editingRoomId}
              roomDraft={roomDraft}
              onStartCreateRoom={startCreateRoom}
              onStartEditRoom={startEditRoom}
              onSaveRoomDraft={saveRoomDraft}
              onDeleteRoom={deleteRoom}
              onCancelRoomEdit={() => { setEditingRoomId(null); setRoomDraft(null); }}
              vouchers={vouchers}
              onAddVoucher={addVoucher}
              onUpdateVoucher={updateVoucher}
              onDeleteVoucher={deleteVoucher}
              onGenerateCode={generateVoucherCode}
              onToast={addToast}
              handleApplyVoucher={handleApplyVoucher}
              clearVoucher={clearVoucher}
              voucherFeedback={voucherFeedback}
              onConfirmPayment={handleConfirmPayment}
              onCancelPayment={handleCancelPayment}
              onRefundPayment={handleRefundPayment}
              onBankAccountsChange={handleBankAccountsChange}
            />
          </motion.main>
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} />
    </div>
  );
}

// ===================================================================
// SITE HEADER
// ===================================================================
function SiteHeader({ businessName, view, onNavigate, onOpenAdmin }: { businessName: string; view: View; onNavigate: (v: View) => void; onOpenAdmin: () => void }) {
  const navItem = (label: string, next: View) => (
    <button type="button" onClick={() => onNavigate(next)} className={`border-b-2 pb-0.5 px-1 py-2 text-sm font-medium tracking-wide transition ${view === next ? "border-amber-400 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-200"}`}>{label}</button>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => onNavigate("home")} className="text-left max-w-[180px] sm:max-w-xs truncate">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80 font-sans">An elevated social lounge for every occasion</div>
          <div className="text-base sm:text-xl font-serif font-semibold text-stone-100 truncate">{businessName}</div>
        </button>
        <nav className="flex items-center gap-3 sm:gap-5">
          {navItem("Home", "home")}
          {navItem("Reserve", "booking")}
          {navItem("Contact", "contact")}
          <button type="button" onClick={onOpenAdmin} className="rounded-full bg-amber-400 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-stone-950 transition hover:bg-amber-300 shadow-md shadow-amber-500/20">Admin</button>
        </nav>
      </div>
    </header>
  );
}

// ===================================================================
// SUPABASE AUTH LOGIN
// ===================================================================
function SupabaseLogin({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-stone-700 bg-stone-900 p-8 shadow-2xl shadow-stone-950/60">
      <div className="text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="mt-4 text-2xl font-serif font-semibold text-stone-100">Staff Sign In</h2>
        <p className="mt-2 text-sm text-stone-400">Sign in with your Supabase account.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-stone-300">Email</label>
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="admin@example.com" required className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
        </div>
        <div>
          <label className="block text-sm text-stone-300">Password</label>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" required className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <ActionButton type="submit" className="w-full sm:flex-1" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</ActionButton>
          <ActionButton variant="ghost" onClick={onCancel} className="w-full sm:flex-1">Cancel</ActionButton>
        </div>
      </form>
    </div>
  );
}

// ===================================================================
// ADMIN LOGIN (legacy password-based fallback)
// ===================================================================
function AdminLogin({ correctPassword, onLogin, onCancel }: { correctPassword: string; onLogin: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) { setError(false); onLogin(); } else setError(true);
  };
  return (
    <div className="w-full max-w-md rounded-3xl border border-stone-700 bg-stone-900 p-8 shadow-2xl shadow-stone-950/60">
      <div className="text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="mt-4 text-2xl font-serif font-semibold text-stone-100">Staff Access</h2>
        <p className="mt-2 text-sm text-stone-400">Enter the admin password to access the dashboard.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-stone-300">Password</label>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} placeholder="••••••••" required className="mt-2 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
          {error && <p className="mt-2 text-xs text-rose-400">Incorrect password.</p>}
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-200/80">☕ Default password: <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-amber-300">admin123</code></div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <ActionButton type="submit" className="w-full sm:flex-1">Sign in</ActionButton>
          <ActionButton variant="ghost" onClick={onCancel} className="w-full sm:flex-1">Cancel</ActionButton>
        </div>
      </form>
    </div>
  );
}

// ===================================================================
// HOME VIEW
// ===================================================================
function HomeView({ settings, onNavigate }: { settings: Settings; onNavigate: (v: View) => void }) {
  return (
    <section className="relative min-h-[calc(100vh-81px)] overflow-hidden">
      <div className="absolute inset-0">
        <img src="/images/room1.jpg" alt="Cozy café interior" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/75 to-stone-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(120,53,15,0.18),transparent_35%)]" />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-7xl items-end px-4 py-14 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-amber-400 text-lg">☕</span>
            <span className="text-xs uppercase tracking-[0.35em] text-amber-400/90 font-sans">An elevated social lounge for every occasion</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-semibold tracking-tight text-stone-100 break-words">{settings.businessName}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-stone-300 sm:text-xl">{settings.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ActionButton onClick={() => onNavigate("booking")}>Reserve a Room</ActionButton>
            <ActionButton variant="ghost" onClick={() => onNavigate("contact")}>Get in Touch</ActionButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ===================================================================
// PUBLIC BOOKING PAGE (with pricing calculator — no room card grid)
// ===================================================================
function BookingPage({ settings, rooms, draft, onChange, onSubmit, vouchers, onApplyVoucher, onClearVoucher, voucherFeedback, bookings }: { settings: Settings; rooms: RoomItem[]; draft: BookingDraft; onChange: (d: BookingDraft) => void; onSubmit: (v: BookingDraft) => void; vouchers: Voucher[]; onApplyVoucher: (code: string, total: number) => void; onClearVoucher: () => void; voucherFeedback: { message: string; valid: boolean }; bookings: Booking[] }) {
  // Auto-select the only room when draft has no room selected
  useEffect(() => {
    if (rooms.length === 1 && !draft.roomId && !draft.roomName) {
      onChange({ ...draft, roomId: rooms[0].id, roomName: rooms[0].name });
    }
  }, []);

  const room = rooms.find((r) => r.id === draft.roomId) || rooms.find((r) => r.name === draft.roomName) || rooms[0];
  const resolvedRoomName = room?.name || "";
  const perPerson = computePerPersonRate(room, draft.duration, draft.withCake, draft.guestCount);
  const total = perPerson * draft.guestCount;
  const timeRange = draft.time && draft.date ? getTimeRangeDisplay(draft.time, draft.duration) : "";
  const slotCheck = isSlotAvailable(draft.date, resolvedRoomName, draft.time, draft.duration, bookings);
  const isInPast = draft.date && draft.time ? new Date(`${draft.date}T${draft.time}`) < new Date() : false;
  const availableSlots = draft.date && resolvedRoomName ? generateAvailableSlots(draft.date, resolvedRoomName, draft.duration, bookings) : [];
  const fullyBooked = draft.date && resolvedRoomName ? isDateFullyBooked(draft.date, resolvedRoomName, bookings) : false;

  const suggestedSlots = availableSlots;
  const durationMin = parseFloat(draft.duration) * 60;
  const maxStartMinutes = CLOSING_MINUTES - durationMin - MAINTENANCE_INTERVAL;
  const maxStartTime = minutesToTime(maxStartMinutes);

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="max-w-2xl space-y-3 border-b border-stone-800 pb-8">
        <div className="flex items-center gap-2 text-amber-400">
          <span>☕</span>
          <span className="text-xs uppercase tracking-[0.35em] font-sans">Private Room Reservations</span>
        </div>
        <h2 className="text-4xl font-serif font-semibold tracking-tight text-stone-100">Call dibs on your weekly dream hangout space</h2>
        <p className="text-stone-400 leading-relaxed">{settings.description}</p>

        {rooms.length > 1 && (
          <div className="pt-2">
            <label className="block text-xs text-stone-400 mb-3">Select a room</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rooms.map((r) => {
                const isSelected = draft.roomId === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => onChange({ ...draft, roomId: isSelected ? "" : r.id, roomName: r.name })} className={`group overflow-hidden rounded-2xl border text-left transition-all duration-200 ${isSelected ? "border-amber-400 ring-2 ring-amber-400/25 shadow-lg shadow-amber-500/10" : "border-stone-800 hover:border-stone-600 hover:shadow-md"}`}>
                    <div className="flex items-center gap-3 p-2">
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                        <img src={r.image || PLACEHOLDER_IMG} alt={r.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        {isSelected && <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-stone-950 text-xs font-bold">✓</span></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold truncate ${isSelected ? "text-amber-300" : "text-stone-100"}`}>{r.name}</div>
                        <div className="text-xs text-stone-500">👥 {r.minGroup}–{r.maxGroup} pax</div>
                      </div>
                      {isSelected && <span className="mr-1 shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">Selected</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form + summary side by side */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          onSubmit={(e) => { e.preventDefault(); if (fullyBooked) return; if (!slotCheck.available) return; if (isInPast) return; onSubmit(draft); }}
          className="space-y-5 rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 shadow-2xl shadow-stone-950/60"
        >
          <CafeField label="Full Name">
            <CafeInput value={draft.name} onChange={(v) => onChange({ ...draft, name: v })} placeholder="Your name" required />
          </CafeField>
          <div className="grid gap-4 sm:grid-cols-2">
            <CafeField label="Email Address">
              <CafeInput value={draft.email} onChange={(v) => onChange({ ...draft, email: v })} type="email" placeholder="you@example.com" required />
            </CafeField>
            <CafeField label="Phone Number">
              <CafeInput value={draft.phone} onChange={(v) => onChange({ ...draft, phone: v })} type="tel" placeholder="+63 9XX XXX XXXX" required />
            </CafeField>
          </div>
          <CafeField label="Event Date">
            <CafeInput value={draft.date} onChange={(v) => onChange({ ...draft, date: v })} type="date" min={todayStr()} required />
          </CafeField>
          {fullyBooked && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              ⚠️ This date is fully booked. Please choose another date.
            </div>
          )}

          {/* Duration + start time + dynamic range preview */}
          <div className="space-y-3 border-t border-stone-800 pt-5">
            <span className="block text-sm text-stone-300 font-medium">Session Duration</span>
            <div className="grid grid-cols-3 gap-2">
              {(["1.5", "2", "3"] as Duration[]).map((d) => (
                <button key={d} type="button" onClick={() => onChange({ ...draft, duration: d })}
                  className={`rounded-xl border py-3 text-xs font-semibold transition ${draft.duration === d ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/30 hover:text-stone-200"}`}>
                  {d === "1.5" ? "1.5hr" : `${d}hr`}
                </button>
              ))}
            </div>

            {draft.date && suggestedSlots.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-stone-500 font-medium">{suggestedSlots.length} available times</span>
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {suggestedSlots.map((t) => (
                    <button key={t} type="button" onClick={() => onChange({ ...draft, time: t })}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${draft.time === t ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/40 hover:text-stone-200"}`}>
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {timeRange && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-stone-400">Your session</span>
                <span className="text-sm font-semibold text-amber-300">{timeRange}</span>
              </div>
            )}

            {draft.time && draft.date && !slotCheck.available && slotCheck.conflicting && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                ⚠️ This time conflicts with <strong>{slotCheck.conflicting.name}</strong> ({formatTime(slotCheck.conflicting.time)} → {formatTime(getEndTime(slotCheck.conflicting.time, slotCheck.conflicting.duration))}).{suggestedSlots.length > 0 && ` Try ${formatTime(suggestedSlots[0])}.`}
              </div>
            )}

            {draft.time && draft.date && timeToMinutes(draft.time) > maxStartMinutes && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                ⚠️ Latest start time for {draft.duration === "1.5" ? "1.5" : `${draft.duration}`} hrs is {formatTime(maxStartTime)}.
              </div>
            )}

            {isInPast && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                ⚠️ This time is in the past. Please select a future time.
              </div>
            )}

            {draft.date && resolvedRoomName && availableSlots.length === 0 && !fullyBooked && draft.date === todayStr() && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⏰ No more available slots for today. Please choose another date.
              </div>
            )}
          </div>

          {/* Cake toggle */}
          <div className="space-y-2.5">
            <span className="block text-sm text-stone-300 font-medium">Celebration Cake</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onChange({ ...draft, withCake: false })}
                className={`rounded-xl border py-3 text-xs font-semibold transition ${!draft.withCake ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/30 hover:text-stone-200"}`}>
                🎂 No Cake
              </button>
              <button type="button" onClick={() => onChange({ ...draft, withCake: true })}
                className={`rounded-xl border py-3 text-xs font-semibold transition ${draft.withCake ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/30 hover:text-stone-200"}`}>
                🍰 With Cake
              </button>
            </div>
          </div>

          {/* Guest count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="block text-sm text-stone-300 font-medium">Number of Guests</span>
              <span className="text-xs text-stone-500">Min {room?.minGroup} · Max {room?.maxGroup}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => onChange({ ...draft, guestCount: Math.max(room?.minGroup ?? 3, draft.guestCount - 1) })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-800 text-stone-300 transition hover:border-amber-400/50 hover:text-amber-300 text-lg font-bold">−</button>
              <input type="range" min={room?.minGroup ?? 3} max={room?.maxGroup ?? 12} value={draft.guestCount} onChange={(e) => onChange({ ...draft, guestCount: Number(e.target.value) })} className="flex-1 min-w-0" />
              <button type="button" onClick={() => onChange({ ...draft, guestCount: Math.min(room?.maxGroup ?? 12, draft.guestCount + 1) })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-800 text-stone-300 transition hover:border-amber-400/50 hover:text-amber-300 text-lg font-bold">+</button>
              <div className="w-14 sm:w-16 shrink-0 rounded-xl bg-stone-800 border border-stone-700 px-2 sm:px-3 py-2 text-center text-sm font-bold text-amber-300">{draft.guestCount}</div>
            </div>
          </div>

          {/* Voucher section */}
          <div className="space-y-2.5 border-t border-stone-800 pt-5">
            <div className="flex items-center justify-between">
              <span className="block text-sm text-stone-300 font-medium">🎟️ Discount Voucher</span>
              {vouchers.filter((v) => v.active).length > 0 && (
                <span className="text-[10px] text-amber-400 font-sans">{vouchers.filter((v) => v.active).length} active offers</span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0"><CafeInput value={draft.voucherCode} onChange={(v) => onChange({ ...draft, voucherCode: v.toUpperCase() })} placeholder="Enter code (e.g. WELCOME10)" /></div>
              <button type="button" onClick={() => onApplyVoucher(draft.voucherCode, total)} disabled={!draft.voucherCode.trim()} className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-300 transition disabled:bg-stone-800 disabled:text-stone-600">Apply</button>
              {draft.appliedDiscount > 0 && <button type="button" onClick={onClearVoucher} className="shrink-0 rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-400 hover:bg-stone-700 transition">✕</button>}
            </div>
            {voucherFeedback.message && (
              <div className={`rounded-lg px-3 py-2 text-xs font-medium ${voucherFeedback.valid ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border border-rose-500/20 text-rose-300"}`}>
                {voucherFeedback.message}
              </div>
            )}
          </div>

          <CafeField label="Special Requests">
            <CafeTextarea value={draft.notes} onChange={(v) => onChange({ ...draft, notes: v })} placeholder="Cake flavor, seating arrangement, dietary restrictions..." rows={3} />
          </CafeField>

          <ActionButton type="submit" className="w-full">Request Reservation</ActionButton>
        </motion.form>

        {/* Price summary card */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 shadow-2xl shadow-stone-950/60 space-y-5 self-start lg:sticky lg:top-24">
          <div className="text-center pb-4 border-b border-stone-800">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Per Person Rate</p>
            <div className="mt-1 text-5xl font-serif font-bold text-amber-400">{formatCurrency(perPerson)}</div>
            <p className="mt-1 text-sm text-stone-400">
              {formatCurrency(perPerson)} × {draft.guestCount} pax
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800/80 px-4 py-1.5">
              <span className="text-xs text-stone-400">Total</span>
              <span className="text-base font-semibold text-stone-100">{formatCurrency(total)}</span>
              {draft.appliedDiscount > 0 && (
                <span className="text-xs text-emerald-400">−{formatCurrency(draft.appliedDiscount)} → <strong className="text-emerald-300">{formatCurrency(total - draft.appliedDiscount)}</strong></span>
              )}
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <SummaryRow label="Room" value={room?.name ?? "—"} />
            <SummaryRow label="Duration" value={draft.duration === "1.5" ? "1.5 Hours" : `${draft.duration} Hours`} />
            <SummaryRow label="Cake" value={draft.withCake ? "🍰 Included" : "🎂 No cake"} />
            <SummaryRow label="Guests" value={`${draft.guestCount} pax`} />
            <SummaryRow label="Per person" value={formatCurrency(perPerson)} highlight />
            {draft.appliedDiscount > 0 && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs text-emerald-300">🎟️ Voucher <code className="font-mono font-bold">{draft.voucherCode}</code></span>
                <span className="text-sm font-bold text-emerald-300">−{formatCurrency(draft.appliedDiscount)}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-stone-700 bg-stone-950/60 p-3 text-[11px] text-stone-500 leading-relaxed">
            ☕ Rates decrease with larger groups. Confirmed pricing is based on your final headcount on arrival.
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className={`text-right ${highlight ? "text-2xl font-serif font-bold text-amber-400" : bold ? "font-semibold text-stone-200" : "text-stone-300"}`}>{value}</span>
    </div>
  );
}

// ===================================================================
// CONTACT PAGE
// ===================================================================
function ContactPage({ settings, draft, onChange, onSubmit }: { settings: Settings; draft: ContactDraft; onChange: (d: ContactDraft) => void; onSubmit: (v: ContactDraft) => void }) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-3"><span>✉️</span><span className="text-xs uppercase tracking-[0.35em] font-sans">Contact Us</span></div>
          <h2 className="mt-1 text-4xl font-serif font-semibold tracking-tight text-stone-100">Send us your thoughts and inquiries</h2>
          <p className="mt-4 max-w-2xl text-stone-400 leading-relaxed">Questions, large group inquiries (13+ pax), and custom arrangements are handled here. We'd love to hear from you!</p>
        </div>
        <div className="space-y-4 border-t border-stone-800 pt-6 text-sm">
          <ContactLine label="Address" value={settings.address} />
          <ContactLine label="Phone" value={settings.phone} />
          <ContactLine label="Email" value={settings.email} />
          <ContactLine label="Hours" value={settings.hours} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-stone-800 shadow-lg">
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d965.2872151339158!2d121.08549330550758!3d14.590592164365615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c7006def589b%3A0x3420f31f99668511!2sMy-Ville%20Co%20Living!5e0!3m2!1sen!2sph!4v1782082075596!5m2!1sen!2sph" width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full"></iframe>
        </div>
      </div>
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} onSubmit={(e) => { e.preventDefault(); onSubmit(draft); }} className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl shadow-stone-950/60">
        <Field label="Full name"><Input value={draft.name} onChange={(v) => onChange({ ...draft, name: v })} placeholder="Your name" required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input value={draft.email} onChange={(v) => onChange({ ...draft, email: v })} type="email" placeholder="you@example.com" required /></Field>
          <Field label="Phone"><Input value={draft.phone} onChange={(v) => onChange({ ...draft, phone: v })} type="tel" placeholder="Mobile Number" /></Field>
        </div>
        <Field label="Subject"><Input value={draft.subject} onChange={(v) => onChange({ ...draft, subject: v })} placeholder="How can we help?" required /></Field>
        <Field label="Message"><Textarea value={draft.message} onChange={(v) => onChange({ ...draft, message: v })} placeholder="Tell us about your request" rows={6} required /></Field>
        <ActionButton type="submit" className="w-full">Send message</ActionButton>
      </motion.form>
    </section>
  );
}

// ===================================================================
// PAYMENT PAGE
// ===================================================================
function PaymentPage({ bookings, pendingBookingId, bankAccounts, paymentSubmitted, onPaymentSubmitted, onUploadReceipt, onNavigate }: { bookings: Booking[]; pendingBookingId: string | null; bankAccounts: BankAccount[]; paymentSubmitted: boolean; onPaymentSubmitted: (v: boolean) => void; onUploadReceipt: (bookingId: string, amount: number, file: File) => Promise<void>; onNavigate: (v: View) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);

  const booking = useMemo(() => bookings.find((b) => b.id === pendingBookingId), [bookings, pendingBookingId]);
  const activeAccounts = useMemo(() => bankAccounts.filter((a) => a.isActive), [bankAccounts]);

  const handleSubmit = async () => {
    if (!booking || !selectedFile) return;
    setUploading(true);
    await onUploadReceipt(booking.id, booking.finalPrice, selectedFile);
    setSelectedFile(null);
    setUploading(false);
    onPaymentSubmitted(true);
  };

  if (!booking) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔍</div>
          <h2 className="text-2xl font-serif font-semibold text-stone-100">Booking not found</h2>
          <p className="text-stone-400">No reservation linked to this payment request.</p>
          <ActionButton onClick={() => onNavigate("home")}>Back to Home</ActionButton>
        </div>
      </section>
    );
  }

  if (paymentSubmitted) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-lg text-center space-y-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-10 shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-5xl">✅</div>
          <h2 className="text-3xl font-serif font-semibold text-emerald-100">Payment Submitted!</h2>
          <p className="text-stone-400 leading-relaxed">
            Your payment for <strong className="text-stone-200">{booking.roomName}</strong> on {formatDate(booking.date)} has been received.
            The admin will confirm your reservation shortly.
          </p>
          <div className="rounded-xl border border-stone-700 bg-stone-950/60 p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Booking</span><span className="text-stone-200">{booking.id}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Amount</span><span className="text-emerald-300 font-bold">{formatCurrency(booking.finalPrice)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Status</span><span className="text-amber-300">Pending Confirmation</span></div>
          </div>
          <ActionButton onClick={() => onNavigate("home")}>Back to Home</ActionButton>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-3 border-b border-stone-800 pb-8">
        <div className="flex items-center gap-2 text-amber-400">
          <span>💳</span>
          <span className="text-xs uppercase tracking-[0.35em] font-sans">Payment</span>
        </div>
        <h2 className="text-4xl font-serif font-semibold tracking-tight text-stone-100">Complete Your Payment</h2>
        <p className="text-stone-400 leading-relaxed">Transfer the total amount to any of the bank accounts below and upload your payment receipt.</p>
      </div>

      <div className="mt-8 mx-auto max-w-2xl space-y-8">
        {/* Amount Due */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 shadow-2xl shadow-stone-950/60 space-y-5 text-center">
          <div className="pb-4 border-b border-stone-800">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Amount Due</p>
            <div className="mt-2 text-5xl font-serif font-bold text-amber-400">{formatCurrency(booking.finalPrice)}</div>
            {booking.discountAmount > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
                <span className="text-xs text-emerald-300">🎟️ Voucher {booking.voucherCode} −{formatCurrency(booking.discountAmount)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2.5 text-sm text-left">
            <SummaryRow label="Room" value={booking.roomName} />
            <SummaryRow label="Duration" value={booking.duration === "1.5" ? "1.5 Hours" : `${booking.duration} Hours`} />
            <SummaryRow label="Cake" value={booking.withCake ? "🍰 Included" : "🎂 No cake"} />
            <SummaryRow label="Guests" value={`${booking.guestCount} pax`} />
            <SummaryRow label="Per person" value={formatCurrency(booking.perPersonPrice)} highlight />
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-stone-300 text-center">Select a Bank Account to Pay</h3>
          {activeAccounts.length === 0 && (
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 text-sm text-stone-500 text-center">No bank accounts available yet. Please contact the admin.</div>
          )}
          {activeAccounts.map((acc) => (
            <div key={acc.id} className="rounded-2xl border border-stone-800 bg-stone-900 p-6 space-y-4 text-center">
              <h4 className="text-lg font-semibold text-stone-200">{acc.bankName}</h4>
              {acc.qrCodeUrl && (
                <button type="button" onClick={() => setZoomedQr(acc.qrCodeUrl)} className="mx-auto block">
                  <img src={acc.qrCodeUrl} alt="QR Code" className="mx-auto max-w-xs w-full rounded-xl border border-stone-700 object-contain bg-white cursor-pointer hover:opacity-90 transition" />
                </button>
              )}
              <div className="space-y-1.5 text-sm">
                <div><span className="text-stone-500">Account Name:</span><span className="ml-2 text-stone-200 font-mono">{acc.accountName}</span></div>
                <div><span className="text-stone-500">Account Number:</span><span className="ml-2 text-stone-200 font-mono tracking-wider">{acc.accountNumber}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Receipt */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-stone-300 text-center">Upload Payment Receipt</h3>
          <div className="text-center">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-5 py-3 text-sm text-stone-300 transition hover:bg-stone-700">
              {selectedFile ? "Change file" : "Choose receipt image"}
              <input type="file" accept="image/*" onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); }} className="hidden" />
            </label>
            {selectedFile && <span className="ml-3 text-xs text-stone-500">{selectedFile.name}</span>}
          </div>
          {selectedFile && (
            <div className="overflow-hidden rounded-xl border border-stone-700">
              <img src={URL.createObjectURL(selectedFile)} alt="Receipt preview" className="max-h-48 w-full object-contain bg-stone-950" />
            </div>
          )}
          <ActionButton onClick={handleSubmit} disabled={!selectedFile || uploading} className="w-full">
            {uploading ? "Uploading..." : `Pay ${formatCurrency(booking.finalPrice)}`}
          </ActionButton>
          <p className="text-center text-[11px] text-stone-500">
            ☕ Please upload a clear screenshot or photo of your payment receipt. The admin will confirm your booking once the payment is verified.
          </p>
        </div>
      </div>

      {/* QR Zoom Modal */}
      {zoomedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomedQr(null)}>
          <button type="button" onClick={() => setZoomedQr(null)} className="absolute top-4 right-4 text-white/60 hover:text-white text-3xl">&times;</button>
          <img src={zoomedQr} alt="QR Code full size" className="max-h-[90vh] max-w-[90vw] rounded-2xl border border-stone-700 bg-white object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}

// ===================================================================
// ADMIN PANEL
// ===================================================================
function AdminPanel(props: {
  bookings: Booking[];
  contacts: ContactMessage[];
  payments: Payment[];
  bankAccounts: BankAccount[];
  settings: Settings;
  rooms: RoomItem[];
  adminTab: AdminTab;
  setAdminTab: (t: AdminTab) => void;
  bookingDraft: BookingDraft;
  setBookingDraft: (d: BookingDraft) => void;
  editingBookingId: string | null;
  isFrontDeskOpen: boolean;
  setIsFrontDeskOpen: (b: boolean) => void;
  onSubmitBooking: (v: BookingDraft) => void;
  onEditBooking: (b: Booking) => void;
  onDeleteBooking: (id: string) => void;
  contactUpdateStatus: (id: string, s: ContactStatus) => void;
  onDeleteContact: (id: string) => void;
  onSettingsChange: (s: Settings) => void;
  onSaveSettings: () => void;
  onCloseAdmin: () => void;
  onSignOut: () => void;
  onCancelBookingEdit: () => void;
  editingRoomId: string | null;
  roomDraft: RoomItem | null;
  onStartCreateRoom: () => void;
  onStartEditRoom: (r: RoomItem) => void;
  onSaveRoomDraft: (room: RoomItem) => void;
  onDeleteRoom: (id: string) => void;
  onCancelRoomEdit: () => void;
  vouchers: Voucher[];
  onAddVoucher: (v: Omit<Voucher, "id" | "usedCount" | "createdAt">) => void;
  onUpdateVoucher: (id: string, patch: Partial<Voucher>) => void;
  onDeleteVoucher: (id: string) => void;
  onGenerateCode: (prefix?: string) => string;
  onToast: (title: string, desc?: string, tone?: ToastTone) => void;
  handleApplyVoucher: (code: string, total: number) => void;
  clearVoucher: () => void;
  voucherFeedback: { message: string; valid: boolean };
  onConfirmPayment: (paymentId: string, bookingId: string) => void;
  onCancelPayment: (paymentId: string) => void;
  onRefundPayment: (paymentId: string) => void;
  onBankAccountsChange: (accounts: BankAccount[]) => void;
}) {
  const { bookings, contacts, payments, bankAccounts, settings, rooms, adminTab, setAdminTab, bookingDraft, setBookingDraft, editingBookingId, isFrontDeskOpen, setIsFrontDeskOpen, onSubmitBooking, onEditBooking, onDeleteBooking, contactUpdateStatus, onDeleteContact, onSettingsChange, onSaveSettings, onCloseAdmin, onSignOut, onCancelBookingEdit, roomDraft, onStartCreateRoom, onStartEditRoom, onSaveRoomDraft, onDeleteRoom, onCancelRoomEdit, vouchers, onAddVoucher, onUpdateVoucher, onDeleteVoucher, onGenerateCode, onToast, handleApplyVoucher, clearVoucher, voucherFeedback, onConfirmPayment, onCancelPayment, onRefundPayment, onBankAccountsChange } = props;

  const [previewImg, setPreviewImg] = useState("");
  const [baDraft, setBaDraft] = useState<BankAccount | null>(null);
  const [voucherCreateMode, setVoucherCreateMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [voucherDraft, setVoucherDraft] = useState({
    code: "",
    type: "percentage" as VoucherType,
    value: 10,
    minPurchase: 2000,
    maxUses: 50,
    expiresAt: "2026-12-31",
    active: true,
    description: "",
  });
  const totalRevenue = bookings.filter((b) => b.status === "Confirmed" || b.status === "Completed").reduce((s, b) => s + b.totalPrice, 0);
  const pendingCount = bookings.filter((b) => b.status === "Pending").length;
  const newContacts = contacts.filter((c) => c.status === "New").length;

  return (
    <>
    {/* Mobile header bar */}
    <div className="sticky top-0 z-30 border-b border-stone-800 bg-stone-950/90 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} className="rounded-xl border border-stone-700 bg-stone-800 p-2 text-stone-300 hover:bg-stone-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80 font-sans">Admin panel</div>
            <h2 className="text-base font-serif font-semibold text-stone-100">Dashboard</h2>
          </div>
        </div>
        <button type="button" onClick={onCloseAdmin} className="rounded-xl border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-300 transition hover:bg-stone-700">Exit</button>
      </div>
    </div>

    {/* Mobile sidebar overlay */}
    {mobileSidebarOpen && (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
        <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-stone-800 bg-stone-950 p-5 shadow-2xl shadow-stone-950/80">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80 font-sans">Admin panel</div>
              <h2 className="text-lg font-serif font-semibold text-stone-100">Dashboard</h2>
            </div>
            <button type="button" onClick={() => setMobileSidebarOpen(false)} className="rounded-xl border border-stone-700 bg-stone-800 p-1.5 text-stone-400 hover:bg-stone-700 hover:text-stone-100">✕</button>
          </div>
          <div className="mt-4 space-y-2">
            {([
              ["bookings", `Bookings (${bookings.length})`],
              ["contacts", `Contacts (${contacts.length})`],
              ["payments", `Payments (${payments.length})`],
              ["rooms", "Rooms"],
              ["vouchers", "Vouchers"],
              ["analytics", "Analytics"],
              ["settings", "Settings"],
            ] as [AdminTab, string][]).map(([tab, label]) => (
              <SidebarButton key={tab} active={adminTab === tab} onClick={() => { setAdminTab(tab); setMobileSidebarOpen(false); }}>{label}</SidebarButton>
            ))}
          </div>
          <div className="mt-6 space-y-3 border-t border-stone-800 pt-4 text-sm text-stone-400">
            <div className="flex items-center justify-between"><span>Bookings</span><span className="text-amber-400 font-semibold">{bookings.length}</span></div>
            <div className="flex items-center justify-between"><span>Rooms</span><span className="text-amber-400 font-semibold">{rooms.length}</span></div>
            <div className="flex items-center justify-between"><span>Contacts</span><span className="text-amber-400 font-semibold">{contacts.length}</span></div>
          </div>
          <button type="button" onClick={() => { setMobileSidebarOpen(false); onCloseAdmin(); }} className="mt-4 w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-300 transition hover:bg-stone-700 hover:text-stone-100">Exit dashboard</button>
          <button type="button" onClick={() => { setMobileSidebarOpen(false); onSignOut(); }} className="mt-2 w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 transition hover:bg-rose-500/20">Sign out</button>
        </motion.aside>
      </div>
    )}

    <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
      <aside className="hidden lg:block h-fit rounded-2xl border border-stone-800 bg-stone-900 p-4">
        <div className="border-b border-stone-800 pb-4 space-y-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80 font-sans">Admin panel</div>
          <h2 className="text-xl font-serif font-semibold text-stone-100">Dashboard</h2>
        </div>
        <div className="mt-4 space-y-2">
          <SidebarButton active={adminTab === "bookings"} onClick={() => setAdminTab("bookings")}>Bookings</SidebarButton>
          <SidebarButton active={adminTab === "contacts"} onClick={() => setAdminTab("contacts")}>Contacts</SidebarButton>
          <SidebarButton active={adminTab === "payments"} onClick={() => setAdminTab("payments")}>Payments</SidebarButton>
          <SidebarButton active={adminTab === "rooms"} onClick={() => setAdminTab("rooms")}>Rooms CRUD</SidebarButton>
          <SidebarButton active={adminTab === "vouchers"} onClick={() => setAdminTab("vouchers")}>Discount Vouchers</SidebarButton>
          <SidebarButton active={adminTab === "analytics"} onClick={() => setAdminTab("analytics")}>Analytics & Reports</SidebarButton>
          <SidebarButton active={adminTab === "settings"} onClick={() => setAdminTab("settings")}>Business settings</SidebarButton>
        </div>
        <div className="mt-6 space-y-3 border-t border-stone-800 pt-4 text-sm text-stone-400">
          <div className="flex items-center justify-between"><span>Bookings</span><span className="text-amber-400 font-semibold">{bookings.length}</span></div>
          <div className="flex items-center justify-between"><span>Rooms</span><span className="text-amber-400 font-semibold">{rooms.length}</span></div>
          <div className="flex items-center justify-between"><span>Contacts</span><span className="text-amber-400 font-semibold">{contacts.length}</span></div>
        </div>
        <button type="button" onClick={onCloseAdmin} className="mt-4 w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-300 transition hover:bg-stone-700 hover:text-stone-100">Exit dashboard</button>
        <button type="button" onClick={onSignOut} className="mt-2 w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 transition hover:bg-rose-500/20">Sign out</button>
      </aside>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {/* ---------- BOOKINGS TAB ---------- */}
          {adminTab === "bookings" && (
            <motion.section key="bookings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Reservations</p>
                  <h3 className="mt-1 text-2xl font-serif font-semibold text-stone-100">Booking Management</h3>
                  <p className="mt-1 text-sm text-stone-400">View, edit, and manage all room reservations.</p>
                </div>
                {editingBookingId ? <button type="button" onClick={onCancelBookingEdit} className="w-full sm:w-auto rounded-full border border-stone-700 px-4 py-3 text-sm text-stone-300 transition hover:bg-stone-800">Cancel Edit</button> : null}
              </div>

              {/* Edit Reservation Modal */}
              <AnimatePresence>
                {isFrontDeskOpen && <FrontDeskModal roomDraft={bookingDraft} setRoomDraft={setBookingDraft} rooms={rooms} onSubmit={onSubmitBooking} onClose={() => setIsFrontDeskOpen(false)} editingBookingId={editingBookingId} vouchers={vouchers} onApplyVoucher={handleApplyVoucher} onClearVoucher={clearVoucher} voucherFeedback={voucherFeedback} bookings={bookings} />}
              </AnimatePresence>

              {/* Bookings list */}
              <ListPanel title="All Reservations" description="Sorted by date and time, newest first.">
                <div className="divide-y divide-white/10">
                  {bookings.map((b) => (
                    <div key={b.id} className="grid gap-4 py-4 lg:grid-cols-[1.4fr_1fr_0.6fr_auto] lg:items-start">
                      <div>
                        <div className="font-medium text-white">{b.name}</div>
                        <div className="text-sm text-slate-400">{b.email} · {b.phone}</div>
                        {b.notes ? <div className="mt-1 text-xs text-slate-400 italic">"{b.notes}"</div> : null}
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="font-medium text-cyan-300">{b.roomName}</div>
                        <div className="text-slate-400 text-xs">{formatDate(b.date)} at {formatTime(b.time)}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          👥 {b.guestCount} pax · ⏱ {b.duration === "1.5" ? "1.5h" : `${b.duration}h`} · {b.withCake ? "🍰 with cake" : "🎂 no cake"}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-base font-bold text-white">{formatCurrency(b.totalPrice)}</div>
                        <div className="text-[10px] text-slate-400">{formatCurrency(b.perPersonPrice)} / person</div>
                        <StatusPill status={b.status} />
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        <button type="button" onClick={() => onEditBooking(b)} className="flex-1 sm:flex-none rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10">Edit</button>
                        <button type="button" onClick={() => onDeleteBooking(b.id)} className="flex-1 sm:flex-none rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20">Delete</button>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 ? <EmptyState message="No reservations yet." /> : null}
                </div>
              </ListPanel>
            </motion.section>
          )}

          {/* ---------- CONTACTS TAB ---------- */}
          {adminTab === "contacts" && (
            <motion.section key="contacts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <ListPanel title="Contact inbox" description="Manage every contact request.">
                <div className="divide-y divide-white/10">
                  {contacts.map((c) => (
                    <div key={c.id} className="grid gap-4 py-4 lg:grid-cols-[1.1fr_1.2fr_auto] lg:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-white">{c.name}</div>
                          <StatusPill status={c.status} compact />
                        </div>
                        <div className="text-sm text-slate-400">{c.email}</div>
                        <div className="text-sm text-slate-400">{c.phone || "No phone provided"}</div>
                        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{formatDateTime(c.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{c.subject}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{c.message}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {c.status !== "Read" ? <button type="button" onClick={() => contactUpdateStatus(c.id, "Read")} className="flex-1 sm:flex-none rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10">Mark read</button> : null}
                        {c.status !== "Archived" ? <button type="button" onClick={() => contactUpdateStatus(c.id, "Archived")} className="flex-1 sm:flex-none rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10">Archive</button> : null}
                        <button type="button" onClick={() => onDeleteContact(c.id)} className="flex-1 sm:flex-none rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20">Delete</button>
                      </div>
                    </div>
                  ))}
                  {contacts.length === 0 ? <EmptyState message="No contact messages yet." /> : null}
                </div>
              </ListPanel>
            </motion.section>
          )}

          {/* ---------- PAYMENTS TAB ---------- */}
          {adminTab === "payments" && (
            <motion.section key="payments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Payment Management</p>
                <h3 className="mt-1 text-2xl font-serif font-semibold text-stone-100">Payments</h3>
                <p className="mt-1 text-sm text-stone-400">Review and confirm customer payments. Confirming a payment will also confirm the booking.</p>
              </div>

              <ListPanel title={`All Payments (${payments.length})`} description="Pending payments require your verification.">
                <div className="divide-y divide-white/10">
                  {payments.length === 0 && <EmptyState message="No payments yet." />}
                  {payments.map((pmt) => {
                    const bkg = bookings.find((b) => b.id === pmt.bookingId);
                    return (
                      <div key={pmt.id} className="grid gap-4 py-4 lg:grid-cols-[1.2fr_0.8fr_0.6fr_auto] lg:items-start">
                        <div>
                          <div className="font-medium text-white">{bkg?.name || "Unknown"}</div>
                          <div className="text-sm text-slate-400">{bkg?.email} · {bkg?.phone}</div>
                          {bkg && (
                            <div className="text-xs text-slate-500 mt-1">
                              {bkg.roomName} · {formatDate(bkg.date)} at {formatTime(bkg.time)}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">Booking ID: {pmt.bookingId}</div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-base font-bold text-white">{formatCurrency(pmt.amount)}</div>
                          <StatusPill status={pmt.status} />
                          {pmt.paidAt && <div className="text-[10px] text-slate-500">Paid: {formatDateTime(pmt.paidAt)}</div>}
                          {pmt.confirmedAt && <div className="text-[10px] text-slate-500">Confirmed: {formatDateTime(pmt.confirmedAt)}</div>}
                        </div>
                        <div className="text-center sm:text-left">
                          {pmt.receiptUrl ? (
                            <button type="button" onClick={() => setPreviewImg(pmt.receiptUrl)} className="group relative inline-block">
                              <img src={pmt.receiptUrl} alt="Receipt" className="h-20 w-28 rounded-xl border border-white/10 object-contain bg-stone-950 transition group-hover:border-amber-400/50 mx-auto sm:mx-0" />
                              <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-bold text-stone-950 opacity-0 transition group-hover:opacity-100">View</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">No receipt</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {pmt.status === "Pending" && (
                            <>
                              <button type="button" onClick={() => onConfirmPayment(pmt.id, pmt.bookingId)} className="flex-1 sm:flex-none rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/20">Confirm</button>
                              <button type="button" onClick={() => onCancelPayment(pmt.id)} className="flex-1 sm:flex-none rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20">Cancel</button>
                            </>
                          )}
                          {pmt.status === "Confirmed" && (
                            <>
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">✅ Confirmed</span>
                              <button type="button" onClick={() => onRefundPayment(pmt.id)} className="flex-1 sm:flex-none rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 transition hover:bg-sky-500/20">Refund</button>
                            </>
                          )}
                          {pmt.status === "Cancelled" && <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">❌ Cancelled</span>}
                          {pmt.status === "Refunded" && <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">↩ Refunded</span>}
                          {pmt.status === "Failed" && <span className="rounded-full border border-stone-500/30 bg-stone-500/10 px-3 py-2 text-xs text-stone-400">⚠ Failed</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ListPanel>
            </motion.section>
          )}

          {/* ---------- ROOMS CRUD TAB ---------- */}
          {adminTab === "rooms" && (
            <motion.section key="rooms" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Rooms Management</p>
                  <h3 className="mt-1 text-2xl font-serif font-semibold text-stone-100">Rooms CRUD</h3>
                  <p className="mt-1 text-sm text-stone-400">Add, edit, or remove rooms. Each room has its own full pricing matrix (3–12 pax × durations × cake).</p>
                </div>
                <button type="button" onClick={onStartCreateRoom} className="w-full sm:w-auto rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 shadow-lg shadow-cyan-400/20">+ Add New Room</button>
              </div>

              {/* Room editor modal */}
              <AnimatePresence>
                {roomDraft && <RoomEditor room={roomDraft} onSave={onSaveRoomDraft} onCancel={onCancelRoomEdit} onToast={onToast} />}
              </AnimatePresence>

              {/* Rooms list */}
              <ListPanel title={`Registered Rooms (${rooms.length})`} description="Click edit to modify the pricing matrix.">
                <div className="divide-y divide-white/10">
                  {rooms.map((r) => (
                    <div key={r.id} className="grid gap-4 py-4 lg:grid-cols-[1.5fr_1fr_0.6fr_auto] lg:items-center">
                      <div className="flex items-center gap-3">
                        <img src={r.image || PLACEHOLDER_IMG} alt={r.name} className="h-16 w-20 shrink-0 rounded-xl object-cover border border-white/10" />
                        <div>
                          <div className="font-medium text-white">{r.name}</div>
                          <div className="text-xs text-slate-400">{r.minGroup}–{r.maxGroup} guests</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300">
                        <div className="font-medium text-cyan-300">{r.pricing.length} pricing tiers</div>
                        <div className="text-slate-400 text-xs">1.5h / 2h / 3h × with & without cake</div>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">{r.description}</div>
                      <div className="flex gap-2 lg:justify-end">
                        <button type="button" onClick={() => onStartEditRoom(r)} className="flex-1 sm:flex-none rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10">Edit Pricing</button>
                        <button type="button" onClick={() => { if (confirm(`Delete "${r.name}"?`)) onDeleteRoom(r.id); }} className="flex-1 sm:flex-none rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20">Delete</button>
                      </div>
                    </div>
                  ))}
                  {rooms.length === 0 ? <EmptyState message="No rooms configured yet." /> : null}
                </div>
              </ListPanel>
            </motion.section>
          )}

          {/* ---------- ANALYTICS TAB ---------- */}
          {adminTab === "analytics" && (
            <motion.section key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Total Confirmed Revenue</div>
                  <div className="mt-2 text-3xl font-serif font-bold text-amber-400">{formatCurrency(totalRevenue)}</div>
                  <div className="mt-1 text-xs text-stone-500">Based on per-person matrix</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Total Reservations</div>
                  <div className="mt-2 text-3xl font-serif font-bold text-stone-100">{bookings.length}</div>
                  <div className="mt-1 text-xs text-emerald-400">{bookings.filter((b) => b.status === "Confirmed").length} Confirmed</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Pending Actions</div>
                  <div className="mt-2 text-3xl font-serif font-bold text-amber-300">{pendingCount}</div>
                  <div className="mt-1 text-xs text-stone-500">Awaiting verification</div>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Unread Messages</div>
                  <div className="mt-2 text-3xl font-serif font-bold text-sky-300">{newContacts}</div>
                  <div className="mt-1 text-xs text-stone-500">From contact form</div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
                  <h4 className="text-lg font-semibold text-white">Reservation Status Matrix</h4>
                  <div className="space-y-3">
                    {([
                      { label: "Confirmed", count: bookings.filter((b) => b.status === "Confirmed").length, color: "bg-emerald-400" },
                      { label: "Pending", count: bookings.filter((b) => b.status === "Pending").length, color: "bg-amber-400" },
                      { label: "Completed", count: bookings.filter((b) => b.status === "Completed").length, color: "bg-sky-400" },
                      { label: "Cancelled", count: bookings.filter((b) => b.status === "Cancelled").length, color: "bg-rose-400" },
                    ]).map((s) => {
                      const total = bookings.length || 1;
                      const pct = Math.round((s.count / total) * 100);
                      return (
                        <div key={s.label} className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="text-slate-300">{s.label}</span><span className="font-semibold text-white">{s.count} ({pct}%)</span></div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950/60"><div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
                  <h4 className="text-lg font-semibold text-white">Room Popularity Index</h4>
                  <div className="divide-y divide-white/5">
                    {rooms.map((r) => {
                      const count = bookings.filter((b) => b.roomName === r.name).length;
                      const rev = bookings.filter((b) => b.roomName === r.name).reduce((s, b) => s + b.totalPrice, 0);
                      return (
                        <div key={r.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-3">
                            <img src={r.image || PLACEHOLDER_IMG} alt={r.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                            <div><div className="text-xs font-medium text-white">{r.name}</div><div className="text-[10px] text-slate-400">₱{r.pricing[0]?.perPersonRates[3] ?? 0}/person base</div></div>
                          </div>
                          <div className="text-right"><div className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-300">{count} stays</div><div className="mt-1 text-[10px] text-slate-400">{formatCurrency(rev)} revenue</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
                <div><h4 className="text-lg font-semibold text-white">System Reports & Exports</h4><p className="text-xs text-slate-300">Generate secure audit ledgers and financial export logs.</p></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: "📄", label: "Daily Operations Ledger", sub: "CSV Formatted Audit", msg: "Daily Front Desk Ledger generated." },
                    { icon: "📊", label: "Monthly Revenue Matrix", sub: "PDF Financial Summary", msg: "Monthly Revenue Analysis PDF compiled." },
                    { icon: "👥", label: "Guest Manifest Register", sub: "Housekeeping Data Link", msg: "Guest Manifest certified. Secure link copied." },
                  ].map((r) => (
                    <button key={r.label} type="button" onClick={() => alert(r.msg)} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-center transition hover:border-cyan-400/40 hover:bg-white/5">
                      <span className="text-xl">{r.icon}</span>
                      <div><div className="text-xs font-semibold text-white">{r.label}</div><div className="text-[10px] text-slate-400">{r.sub}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* ---------- VOUCHERS TAB ---------- */}
          {adminTab === "vouchers" && (() => {
            const activeCount = vouchers.filter((v) => v.active).length;
            const totalRedemptions = vouchers.reduce((s, v) => s + v.usedCount, 0);
            const totalDiscountGiven = bookings.reduce((s, b) => s + (b.discountAmount || 0), 0);

            return (
              <motion.section key="vouchers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
                {/* Stats row */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5"><div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Active Vouchers</div><div className="mt-2 text-3xl font-serif font-bold text-amber-400">{activeCount}</div><div className="mt-1 text-xs text-stone-500">of {vouchers.length} total</div></div>
                  <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5"><div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Total Redemptions</div><div className="mt-2 text-3xl font-serif font-bold text-stone-100">{totalRedemptions}</div><div className="mt-1 text-xs text-stone-500">across all codes</div></div>
                  <div className="rounded-2xl border border-stone-800 bg-stone-900 p-5"><div className="text-xs uppercase tracking-wider text-stone-500 font-sans">Total Discounts Given</div><div className="mt-2 text-3xl font-serif font-bold text-emerald-400">{formatCurrency(totalDiscountGiven)}</div><div className="mt-1 text-xs text-stone-500">lifetime</div></div>
                </div>

                {/* Create / List header */}
                <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6 flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Discount Vouchers</p><h3 className="mt-1 text-2xl font-serif font-semibold text-stone-100">Voucher Management</h3><p className="mt-1 text-sm text-stone-400">Generate unique codes, set discounts, and track redemptions.</p></div>
                  <button type="button" onClick={() => { setVoucherCreateMode((prev) => !prev); setVoucherDraft({ code: onGenerateCode("SOUL"), type: "percentage", value: 10, minPurchase: 2000, maxUses: 50, expiresAt: "2026-12-31", active: true, description: "" }); }} className="w-full sm:w-auto rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-stone-950 shadow-md shadow-amber-500/20 hover:bg-amber-300 transition">{voucherCreateMode ? "Cancel" : "✨ Generate New Voucher"}</button>
                </div>

                {/* Create form */}
                {voucherCreateMode && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
                    <h4 className="text-base font-serif font-semibold text-amber-300">New Voucher</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Voucher Code"><Input value={voucherDraft.code} onChange={(v) => setVoucherDraft({ ...voucherDraft, code: v.toUpperCase() })} placeholder="e.g. SOUL25" required /></Field>
                      <Field label="Discount Type"><Select value={voucherDraft.type} onChange={(v) => setVoucherDraft({ ...voucherDraft, type: v as VoucherType })} options={["percentage", "fixed"]} /></Field>
                      <Field label={`Discount ${voucherDraft.type === "percentage" ? "(%)" : "(₱)"}`}><input type="number" value={voucherDraft.value} onChange={(e) => setVoucherDraft({ ...voucherDraft, value: Number(e.target.value) })} min={1} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" /></Field>
                      <Field label="Min. Purchase (₱)"><input type="number" value={voucherDraft.minPurchase} onChange={(e) => setVoucherDraft({ ...voucherDraft, minPurchase: Number(e.target.value) })} min={0} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" /></Field>
                      <Field label="Max Uses (0 = unlimited)"><input type="number" value={voucherDraft.maxUses} onChange={(e) => setVoucherDraft({ ...voucherDraft, maxUses: Number(e.target.value) })} min={0} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" /></Field>
                      <Field label="Expires At"><input type="date" value={voucherDraft.expiresAt} onChange={(e) => setVoucherDraft({ ...voucherDraft, expiresAt: e.target.value })} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" /></Field>
                      <div className="sm:col-span-2"><Field label="Description"><Textarea value={voucherDraft.description} onChange={(v) => setVoucherDraft({ ...voucherDraft, description: v })} placeholder="e.g. Welcome offer for new customers" rows={2} /></Field></div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                        <input type="checkbox" checked={voucherDraft.active} onChange={(e) => setVoucherDraft({ ...voucherDraft, active: e.target.checked })} className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-amber-500 focus:ring-0 focus:ring-offset-0" />
                        Voucher is active
                      </label>
                      <button type="button" onClick={() => setVoucherDraft((d) => ({ ...d, code: onGenerateCode("SOUL") }))} className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 transition">🎲 Re-roll Code</button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <ActionButton onClick={() => { if (!voucherDraft.code.trim() || voucherDraft.value <= 0) { onToast("Invalid voucher", "Code and value are required.", "warning"); return; } onAddVoucher(voucherDraft); setVoucherCreateMode(false); }} className="flex-1 w-full sm:w-auto">Create Voucher</ActionButton>
                      <ActionButton variant="ghost" onClick={() => setVoucherCreateMode(false)} className="w-full sm:w-auto">Cancel</ActionButton>
                    </div>
                  </motion.div>
                )}

                {/* Voucher list */}
                <ListPanel title={`Voucher Codes (${vouchers.length})`} description="Toggle active, edit, or delete any voucher.">
                  <div className="divide-y divide-stone-800">
                    {vouchers.length === 0 && <EmptyState message="No vouchers yet. Generate your first code above!" />}
                    {vouchers.map((v) => {
                      const expired = v.expiresAt && new Date(v.expiresAt) < new Date();
                      const maxed = v.maxUses > 0 && v.usedCount >= v.maxUses;
                      return (
                        <div key={v.id} className="py-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`shrink-0 rounded-xl border-2 border-dashed px-3 py-2 font-mono text-sm sm:text-base font-bold tracking-wider break-all ${v.active ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-stone-700 bg-stone-950 text-stone-500"}`}>
                              {v.code}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-stone-100">{v.type === "percentage" ? `${v.value}% off` : `${formatCurrency(v.value)} off`}</div>
                              <div className="text-xs text-stone-500">Min {formatCurrency(v.minPurchase)} · {v.description || "No description"}</div>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                                {v.active ? <span className="text-emerald-400">● Active</span> : <span className="text-stone-500">● Inactive</span>}
                                <span>Expires {formatDate(v.expiresAt)}</span>
                                <span>{v.usedCount}/{v.maxUses || "∞"} used</span>
                                {expired && <span className="text-rose-400">· EXPIRED</span>}
                                {maxed && <span className="text-rose-400">· MAXED</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button type="button" onClick={() => { onUpdateVoucher(v.id, { active: !v.active }); onToast(v.active ? "Voucher deactivated" : "Voucher reactivated", v.code, v.active ? "warning" : "success"); }} className={`flex-1 sm:flex-none rounded-full border px-3 py-2 text-xs font-semibold transition ${v.active ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"}`}>
                              {v.active ? "Deactivate" : "Activate"}
                            </button>
                            <button type="button" onClick={() => { const code = prompt("Enter new code:", v.code); if (code) onUpdateVoucher(v.id, { code: code.toUpperCase() }); }} className="flex-1 sm:flex-none rounded-full border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-300 hover:bg-stone-700 transition">Rename</button>
                            <button type="button" onClick={() => { if (confirm(`Delete voucher "${v.code}"?`)) onDeleteVoucher(v.id); }} className="flex-1 sm:flex-none rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20 transition">Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ListPanel>
              </motion.section>
            );
          })()}

          {/* ---------- SETTINGS TAB ---------- */}
          {adminTab === "settings" && (
            <motion.section key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
              <form className="rounded-2xl border border-stone-800 bg-stone-900 p-6" onSubmit={(e) => { e.preventDefault(); onSaveSettings(); }}>
                <div><p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Business settings</p><h3 className="mt-2 text-2xl font-serif font-semibold text-stone-100">Edit business details</h3><p className="mt-2 text-sm text-stone-400">These values appear on the public booking and contact pages.</p></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Business name"><Input value={settings.businessName} onChange={(v) => onSettingsChange({ ...settings, businessName: v })} required /></Field>
                  <Field label="Tagline"><Input value={settings.tagline} onChange={(v) => onSettingsChange({ ...settings, tagline: v })} required /></Field>
                  <Field label="Email"><Input value={settings.email} onChange={(v) => onSettingsChange({ ...settings, email: v })} type="email" required /></Field>
                  <Field label="Phone"><Input value={settings.phone} onChange={(v) => onSettingsChange({ ...settings, phone: v })} required /></Field>
                  <Field label="Address"><Input value={settings.address} onChange={(v) => onSettingsChange({ ...settings, address: v })} required /></Field>
                  <Field label="Hours"><Input value={settings.hours} onChange={(v) => onSettingsChange({ ...settings, hours: v })} required /></Field>
                  <div className="sm:col-span-2"><Field label="Description"><Textarea value={settings.description} onChange={(v) => onSettingsChange({ ...settings, description: v })} rows={4} required /></Field></div>
                  <div className="sm:col-span-2"><Field label="Response message"><Input value={settings.responseTime} onChange={(v) => onSettingsChange({ ...settings, responseTime: v })} required /></Field></div>
                  {!isSupabaseConfigured && (
                    <div className="sm:col-span-2 border-t border-white/10 pt-4 mt-2">
                      <Field label="Admin access password"><Input value={settings.adminPassword ?? ""} onChange={(v) => onSettingsChange({ ...settings, adminPassword: v })} type="text" placeholder="admin123" required /></Field>
                      <p className="mt-1 text-xs text-slate-400">Used to access the admin dashboard. Default is admin123.</p>
                    </div>
                  )}
                </div>
                <div className="mt-6"><ActionButton type="submit">Save business settings</ActionButton></div>
              </form>

              {/* ── Bank Accounts Section ── */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-sans">Payment Config</p>
                    <h3 className="mt-1 text-xl font-serif font-semibold text-stone-100">Bank Accounts</h3>
                    <p className="mt-1 text-sm text-stone-400">These accounts appear on the customer payment page for manual bank transfers.</p>
                  </div>
                  <button type="button" onClick={() => setBaDraft({ id: createId("ba"), bankName: "", accountName: "", accountNumber: "", qrCodeUrl: "", isActive: true })} className="w-full sm:w-auto rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-stone-950 shadow-md shadow-amber-500/20 hover:bg-amber-300 transition">+ Add Bank Account</button>
                </div>

                  {/* Bank account edit form */}
                {baDraft && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-amber-300">{bankAccounts.find((a) => a.id === baDraft.id) ? "Edit" : "New"} Bank Account</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Bank Name"><Input value={baDraft.bankName} onChange={(v) => setBaDraft({ ...baDraft, bankName: v })} placeholder="e.g. BPI, BDO, Metrobank" required /></Field>
                      <Field label="Account Name"><Input value={baDraft.accountName} onChange={(v) => setBaDraft({ ...baDraft, accountName: v })} placeholder="Account holder name" required /></Field>
                      <Field label="Account Number"><Input value={baDraft.accountNumber} onChange={(v) => setBaDraft({ ...baDraft, accountNumber: v })} placeholder="e.g. 1234-5678-90" required /></Field>
                      <Field label="QR Code Image">
                        <div className="flex items-center gap-3">
                          {baDraft.qrCodeUrl && <img src={baDraft.qrCodeUrl} alt="QR preview" className="h-14 w-14 shrink-0 rounded-xl border border-stone-700 object-contain bg-white" />}
                          <label className="cursor-pointer rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-300 transition hover:bg-stone-700">
                            {baDraft.qrCodeUrl ? "Change" : "Upload"} QR Code
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const { url } = await uploadQrImage(file, baDraft.id);
                              setBaDraft({ ...baDraft, qrCodeUrl: url });
                            }} />
                          </label>
                          {baDraft.qrCodeUrl && <button type="button" onClick={() => setBaDraft({ ...baDraft, qrCodeUrl: "" })} className="text-xs text-rose-400 hover:underline">Remove</button>}
                        </div>
                      </Field>
                      <div className="flex items-center gap-3 sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                          <input type="checkbox" checked={baDraft.isActive} onChange={(e) => setBaDraft({ ...baDraft, isActive: e.target.checked })} className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-amber-500 focus:ring-0 focus:ring-offset-0" />
                          Active (visible on payment page)
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <ActionButton onClick={() => {
                        if (!baDraft.bankName.trim() || !baDraft.accountName.trim() || !baDraft.accountNumber.trim()) {
                          onToast("Missing fields", "Bank name, account name, and account number are required.", "warning");
                          return;
                        }
                        const exists = bankAccounts.find((a) => a.id === baDraft.id);
                        const updated = exists
                          ? bankAccounts.map((a) => (a.id === baDraft.id ? baDraft : a))
                          : [...bankAccounts, baDraft];
                        onBankAccountsChange(updated);
                        setBaDraft(null);
                        onToast(exists ? "Bank account updated" : "Bank account added", `${baDraft.bankName} - ${baDraft.accountNumber}`);
                      }} className="w-full sm:w-auto">Save Account</ActionButton>
                      <ActionButton variant="ghost" onClick={() => setBaDraft(null)} className="w-full sm:w-auto">Cancel</ActionButton>
                    </div>
                  </motion.div>
                )}

                {/* Bank accounts list */}
                <div className="divide-y divide-stone-800">
                  {bankAccounts.length === 0 && <EmptyState message="No bank accounts configured. Add one above." />}
                  {bankAccounts.map((acc) => (
                    <div key={acc.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {acc.qrCodeUrl && (
                          <img src={acc.qrCodeUrl} alt="QR" className="h-12 w-12 shrink-0 rounded-xl border border-stone-700 object-cover" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-100">{acc.bankName}</span>
                            {acc.isActive ? <span className="text-[10px] text-emerald-400">● Active</span> : <span className="text-[10px] text-stone-500">● Inactive</span>}
                          </div>
                          <div className="text-sm text-stone-400 font-mono">{acc.accountName}</div>
                          <div className="text-sm text-stone-400 font-mono tracking-wider">{acc.accountNumber}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        <button type="button" onClick={() => setBaDraft({ ...acc })} className="flex-1 sm:flex-none rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10">Edit</button>
                        <button type="button" onClick={() => {
                          if (confirm(`Delete "${acc.bankName}" account?`)) {
                            onBankAccountsChange(bankAccounts.filter((a) => a.id !== acc.id));
                            onToast("Bank account deleted", `${acc.bankName} was removed.`, "warning");
                          }
                        }} className="flex-1 sm:flex-none rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* Image preview lightbox */}
    {previewImg && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" onClick={() => setPreviewImg("")}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-stone-950/90 backdrop-blur-md" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative max-h-[90vh] max-w-[90vw]">
          <button type="button" onClick={() => setPreviewImg("")} className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-600">✕</button>
          <img src={previewImg} alt="Receipt preview" className="max-h-[85vh] max-w-[85vw] rounded-2xl border border-stone-700 object-contain" />
        </motion.div>
      </div>
    )}
    </>
  );
}

// ===================================================================
// FRONT DESK MODAL (two-panel with room images)
// ===================================================================
function FrontDeskModal({ roomDraft, setRoomDraft, rooms, onSubmit, onClose, editingBookingId, vouchers, onApplyVoucher, onClearVoucher, voucherFeedback, bookings }: { roomDraft: BookingDraft; setRoomDraft: (d: BookingDraft) => void; rooms: RoomItem[]; onSubmit: (v: BookingDraft) => void; onClose: () => void; editingBookingId: string | null; vouchers: Voucher[]; onApplyVoucher: (code: string, total: number) => void; onClearVoucher: () => void; voucherFeedback: { message: string; valid: boolean }; bookings: Booking[] }) {
  const room = rooms.find((r) => r.id === roomDraft.roomId) || rooms.find((r) => r.name === roomDraft.roomName) || rooms[0];
  const resolvedRoomName = room?.name || "";
  const perPerson = computePerPersonRate(room, roomDraft.duration, roomDraft.withCake, roomDraft.guestCount);
  const total = perPerson * roomDraft.guestCount;
  const timeRange = roomDraft.time && roomDraft.date ? getTimeRangeDisplay(roomDraft.time, roomDraft.duration) : "";
  const slotCheck = isSlotAvailable(roomDraft.date, resolvedRoomName, roomDraft.time, roomDraft.duration, bookings, editingBookingId ?? undefined);
  const isInPast = roomDraft.date && roomDraft.time ? new Date(`${roomDraft.date}T${roomDraft.time}`) < new Date() : false;
  const availableSlots = roomDraft.date && resolvedRoomName ? generateAvailableSlots(roomDraft.date, resolvedRoomName, roomDraft.duration, bookings, editingBookingId ?? undefined) : [];
  const fullyBooked = roomDraft.date && resolvedRoomName ? isDateFullyBooked(roomDraft.date, resolvedRoomName, bookings) : false;
  const suggestedSlots = availableSlots;
  const durationMin = parseFloat(roomDraft.duration) * 60;
  const maxStartMinutes = CLOSING_MINUTES - durationMin - MAINTENANCE_INTERVAL;
  const maxStartTime = minutesToTime(maxStartMinutes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-stone-950/85 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.25 }} className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-stone-700 bg-stone-950 shadow-2xl shadow-stone-950/60 flex flex-col lg:flex-row" style={{ maxHeight: "calc(100vh - 3rem)" }}>
        {/* LEFT - Room Gallery */}
        <div className="flex flex-col lg:w-[42%] shrink-0 border-b border-stone-800 lg:border-b-0 lg:border-r lg:border-stone-800 overflow-y-auto bg-stone-900/70 max-h-64 lg:max-h-none">
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
            <div><div className="text-[10px] font-sans uppercase tracking-widest text-amber-400">Select Room</div><div className="mt-0.5 text-sm font-serif font-semibold text-stone-100">Room Gallery</div></div>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 text-[10px] font-semibold text-amber-300">{rooms.length} available</span>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto">
            {rooms.map((r) => {
              const isSelected = roomDraft.roomId === r.id;
              return (
                <button key={r.id} type="button" onClick={() => setRoomDraft({ ...roomDraft, roomId: isSelected ? "" : r.id, roomName: r.name })} className={`w-full text-left group overflow-hidden rounded-2xl border transition-all duration-200 ${isSelected ? "border-amber-400 ring-2 ring-amber-400/25 shadow-lg shadow-amber-500/10" : "border-stone-800 hover:border-stone-600 hover:shadow-md"}`}>
                  <div className="relative h-32 w-full overflow-hidden bg-stone-800">
                    <img src={r.image || PLACEHOLDER_IMG} alt={r.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-stone-950/85 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-sm border border-stone-700">{r.minGroup}–{r.maxGroup} pax</div>
                    {isSelected && <div className="absolute inset-0 bg-amber-500/15 flex items-center justify-center"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-stone-950 text-base font-bold shadow-lg shadow-amber-400/40">✓</span></div>}
                  </div>
                  <div className={`px-3 py-2.5 ${isSelected ? "bg-amber-500/10" : "bg-stone-900"}`}>
                    <div className="flex items-center justify-between gap-2"><span className={`text-sm font-semibold truncate ${isSelected ? "text-amber-300" : "text-stone-100"}`}>{r.name}</span>{isSelected && <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">Selected</span>}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-stone-500">
                      <span>👥 {r.minGroup}–{r.maxGroup} pax</span>
                      <span>⏱ 1.5h / 2h / 3h</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT - Guest form */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-stone-800 bg-stone-900/80 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
              <div><div className="text-[10px] uppercase tracking-wider text-amber-400 font-sans">Terminal Active</div><h4 className="text-sm font-serif font-semibold text-stone-100">Event Space Front Desk</h4></div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-stone-800 p-1.5 text-stone-400 hover:bg-stone-700 hover:text-stone-100 transition">✕</button>
          </div>

          {/* Selected room preview strip */}
          {room && (
            <div className="flex items-center gap-3 bg-amber-500/5 border-b border-amber-400/15 px-5 py-3 shrink-0">
              <img src={room.image || PLACEHOLDER_IMG} alt={room.name} className="h-12 w-16 rounded-xl object-cover border border-stone-700" />
              <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-stone-100 truncate">{room.name}</div><div className="text-[10px] text-stone-500">Min {room.minGroup} · Max {room.maxGroup} pax</div></div>
              <div className="shrink-0 rounded-xl bg-amber-400/15 border border-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-300">{formatCurrency(total)}</div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(roomDraft); }} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 font-sans">Quick preset:</span>
              <button type="button" onClick={() => setRoomDraft({ ...roomDraft, status: "Confirmed", notes: "Walk-in guest. Payment settled at front desk." })} className="rounded-lg border border-emerald-600/30 bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-900/50 transition">⚡ Walk-in</button>
              <button type="button" onClick={() => setRoomDraft({ ...roomDraft, status: "Completed", notes: "Guest express check-out. Account cleared." })} className="rounded-lg border border-sky-600/30 bg-sky-900/30 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-900/50 transition">🟢 Check-out</button>
              <button type="button" onClick={() => setRoomDraft({ ...roomDraft, status: "Pending", notes: "Advance booking. Awaiting deposit confirmation." })} className="rounded-lg border border-amber-600/30 bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-900/50 transition">🕐 Advance</button>
            </div>

            {/* Guest count + Duration + Cake in compact row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <span className="block text-xs text-stone-400 font-sans">Guests</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setRoomDraft({ ...roomDraft, guestCount: Math.max(room?.minGroup ?? 3, roomDraft.guestCount - 1) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700">−</button>
                  <input type="range" min={room?.minGroup ?? 3} max={room?.maxGroup ?? 12} value={roomDraft.guestCount} onChange={(e) => setRoomDraft({ ...roomDraft, guestCount: Number(e.target.value) })} className="flex-1 accent-amber-500" />
                  <button type="button" onClick={() => setRoomDraft({ ...roomDraft, guestCount: Math.min(room?.maxGroup ?? 12, roomDraft.guestCount + 1) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700">+</button>
                  <div className="w-12 rounded-lg bg-stone-800 border border-stone-700 px-2 py-1.5 text-center text-sm font-bold text-amber-300">{roomDraft.guestCount}</div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-xs text-stone-400 font-sans">Duration</span>
                <div className="grid grid-cols-3 gap-1">
                  {(["1.5", "2", "3"] as Duration[]).map((d) => (
                    <button key={d} type="button" onClick={() => setRoomDraft({ ...roomDraft, duration: d })} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${roomDraft.duration === d ? "bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-400 hover:bg-stone-700"}`}>{d}h</button>
                  ))}
                </div>



                {roomDraft.date && suggestedSlots.length > 0 && (
                  <div className="max-h-28 overflow-y-auto pr-1">
                    <span className="text-[10px] text-stone-500">{suggestedSlots.length} available</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suggestedSlots.map((t) => (
                        <button key={t} type="button" onClick={() => setRoomDraft({ ...roomDraft, time: t })}
                          className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition ${roomDraft.time === t ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-stone-700 bg-stone-800 text-stone-500 hover:border-amber-500/40 hover:text-stone-200"}`}>
                          {formatTime(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {timeRange && (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500">Session</span>
                    <span className="text-xs font-semibold text-amber-300">{timeRange}</span>
                  </div>
                )}
                {roomDraft.time && roomDraft.date && !slotCheck.available && slotCheck.conflicting && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
                    ⚠️ Conflicts with {slotCheck.conflicting.name}{suggestedSlots.length > 0 && ` Try ${formatTime(suggestedSlots[0])}.`}
                  </div>
                )}
                {roomDraft.time && roomDraft.date && timeToMinutes(roomDraft.time) > maxStartMinutes && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
                    ⚠️ Latest start is {formatTime(maxStartTime)}
                  </div>
                )}
                {isInPast && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
                    ⚠️ Time is in the past
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="block text-xs text-stone-400 font-sans">Cake</span>
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => setRoomDraft({ ...roomDraft, withCake: false })} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${!roomDraft.withCake ? "bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-400 hover:bg-stone-700"}`}>🎂 No</button>
                  <button type="button" onClick={() => setRoomDraft({ ...roomDraft, withCake: true })} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${roomDraft.withCake ? "bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-400 hover:bg-stone-700"}`}>🍰 Yes</button>
                </div>
              </div>
            </div>

            {/* Voucher section */}
            <div className="space-y-2 border-t border-stone-800 pt-4">
              <div className="flex items-center justify-between">
                <span className="block text-xs text-stone-400 font-sans">🎟️ Discount Voucher</span>
                {vouchers.filter((v) => v.active).length > 0 && <span className="text-[10px] text-amber-400 font-sans">{vouchers.filter((v) => v.active).length} active</span>}
              </div>
              <div className="flex gap-2">
                <Input value={roomDraft.voucherCode} onChange={(v) => setRoomDraft({ ...roomDraft, voucherCode: v.toUpperCase() })} placeholder="Code (e.g. WELCOME10)" />
                <button type="button" onClick={() => onApplyVoucher(roomDraft.voucherCode, total)} disabled={!roomDraft.voucherCode.trim()} className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-amber-300 transition disabled:bg-stone-800 disabled:text-stone-600">Apply</button>
                {roomDraft.appliedDiscount > 0 && <button type="button" onClick={onClearVoucher} className="shrink-0 rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-400 hover:bg-stone-700 transition">✕</button>}
              </div>
              {voucherFeedback.message && (
                <div className={`rounded-lg px-3 py-2 text-xs font-medium ${voucherFeedback.valid ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border border-rose-500/20 text-rose-300"}`}>{voucherFeedback.message}</div>
              )}
            </div>

            {/* Live price preview */}
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-400 font-sans">Estimated Total</div>
                <div className="text-xs text-stone-500">
                  {roomDraft.appliedDiscount > 0 ? (
                    <span><span className="line-through text-stone-600">{formatCurrency(total)}</span> · after voucher</span>
                  ) : `${roomDraft.guestCount} pax × ${formatCurrency(perPerson)}`}
                </div>
              </div>
              <div className="text-right">
                {roomDraft.appliedDiscount > 0 && <div className="text-[10px] text-emerald-400 font-sans">−{formatCurrency(roomDraft.appliedDiscount)}</div>}
                <div className="text-2xl font-serif font-bold text-amber-300">{formatCurrency(total - roomDraft.appliedDiscount)}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Guest Full Name"><Input value={roomDraft.name} onChange={(v) => setRoomDraft({ ...roomDraft, name: v })} placeholder="E.g. Maria Santos" required /></Field>
              <Field label="Contact Phone"><Input value={roomDraft.phone} onChange={(v) => setRoomDraft({ ...roomDraft, phone: v })} type="tel" placeholder="+63 9XX XXX XXXX" required /></Field>
            </div>
            <Field label="Guest Email Address"><Input value={roomDraft.email} onChange={(v) => setRoomDraft({ ...roomDraft, email: v })} type="email" placeholder="guest@example.com" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Arrival Date"><Input value={roomDraft.date} onChange={(v) => setRoomDraft({ ...roomDraft, date: v })} type="date" min={todayStr()} required /></Field>
              <Field label="Status"><Select value={roomDraft.status} onChange={(v) => setRoomDraft({ ...roomDraft, status: v as BookingStatus })} options={["Pending", "Confirmed", "Completed", "Cancelled"]} /></Field>
            </div>
            {fullyBooked && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                ⚠️ This date is fully booked. Please choose another date.
              </div>
            )}
            <Field label="Front Desk / Audit Notes"><Textarea value={roomDraft.notes} onChange={(v) => setRoomDraft({ ...roomDraft, notes: v })} placeholder="Deposit received, ID reference, special requests..." rows={3} /></Field>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <ActionButton type="submit" className="w-full sm:flex-1">{editingBookingId ? "✏️ Update Reservation" : "🛎️ Register Reservation"}</ActionButton>
              <ActionButton variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancel</ActionButton>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ===================================================================
// ROOM EDITOR MODAL (full pricing matrix CRUD)
// ===================================================================
function RoomEditor({ room: initialRoom, onSave, onCancel, onToast }: { room: RoomItem; onSave: (room: RoomItem) => void; onCancel: () => void; onToast?: (title: string, desc?: string, tone?: ToastTone) => void }) {
  const [room, setRoom] = useState<RoomItem>(() => ({
    ...initialRoom,
    pricing: initialRoom.pricing.map((t) => ({ ...t, perPersonRates: { ...t.perPersonRates } })),
  }));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialRoom.image || "");
  const [uploading, setUploading] = useState(false);

  const groupSizes = useMemo(() => {
    const len = room.maxGroup - room.minGroup + 1;
    return len > 0 ? Array.from({ length: len }, (_, i) => room.minGroup + i) : [];
  }, [room.minGroup, room.maxGroup]);

  const tierLabel = (d: Duration, withCake: boolean) => `${d === "1.5" ? "1.5h" : `${d}h`} · ${withCake ? "🍰 with cake" : "🎂 no cake"}`;

  const updateRate = (tierIdx: number, groupSize: number, value: number) => {
    setRoom((prev) => {
      const next = [...prev.pricing];
      next[tierIdx] = { ...next[tierIdx], perPersonRates: { ...next[tierIdx].perPersonRates, [groupSize]: value } };
      return { ...prev, pricing: next };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setUploading(true);
    let image = room.image;
    if (selectedFile) {
      const { url, storage } = await uploadRoomImage(selectedFile, room.id);
      image = url;
      if (!storage && onToast) {
        onToast("Photo saved as data URL", "Set up Supabase Storage for proper file storage.", "warning");
      }
    }
    onSave({ ...room, image });
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-stone-950/85 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.25 }} className="relative w-full max-w-6xl mx-2 overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-700 bg-stone-950 shadow-2xl flex flex-col" style={{ maxHeight: "calc(100vh - 2rem)" }}>
        {/* Header */}
        <div className="border-b border-stone-800 bg-stone-900/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div><div className="text-[10px] font-sans uppercase tracking-widest text-amber-400">Room Editor</div><h4 className="text-sm font-serif font-semibold text-stone-100">Edit Room & Pricing Matrix</h4></div>
          <button type="button" onClick={onCancel} className="rounded-full bg-stone-800 p-1.5 text-stone-400 hover:bg-stone-700 hover:text-stone-100 transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Room info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Room Name"><Input value={room.name} onChange={(v) => setRoom((prev) => ({ ...prev, name: v }))} required /></Field>
            <Field label="Room Photo">
              <div className="flex items-center gap-4">
                <img src={previewUrl || PLACEHOLDER_IMG} alt="Room preview" className="h-16 w-24 shrink-0 rounded-xl border border-stone-700 object-cover" />
                <div className="flex-1 space-y-2">
                  <label className="inline-block cursor-pointer rounded-xl border border-stone-700 bg-stone-800 px-4 py-2.5 text-sm text-stone-300 transition hover:bg-stone-700">
                    {selectedFile ? "Change file" : "Choose file"}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  {selectedFile && <p className="text-xs text-stone-500 truncate max-w-40">{selectedFile.name}</p>}
                  {room.image && !selectedFile && <p className="text-xs text-amber-500/70">Saved photo exists</p>}
                </div>
              </div>
            </Field>
            <Field label="Minimum Group Size"><input type="number" value={room.minGroup} onChange={(e) => setRoom((prev) => ({ ...prev, minGroup: Number(e.target.value) }))} min={1} max={room.maxGroup} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20" /></Field>
            <Field label="Maximum Group Size"><input type="number" value={room.maxGroup} onChange={(e) => setRoom((prev) => ({ ...prev, maxGroup: Number(e.target.value) }))} min={room.minGroup} max={50} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea value={room.description} onChange={(v) => setRoom((prev) => ({ ...prev, description: v }))} rows={2} required /></Field></div>
          </div>

          {/* Pricing Matrix */}
          <div className="space-y-3">
            <div><h4 className="text-base font-serif font-semibold text-stone-100">Pricing Matrix</h4><p className="text-xs text-stone-500">Per-person rates in Philippine Pesos (₱). Edit any cell directly.</p></div>

            <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-stone-950/60">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/80">
                    <th className="sticky left-0 bg-stone-900 px-4 py-3 text-left text-xs font-semibold text-stone-400">Group Size</th>
                    {room.pricing.map((tier, i) => (
                      <th key={i} className="px-4 py-3 text-center text-xs font-semibold text-stone-400">
                        <div>{tierLabel(tier.duration, tier.withCake)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupSizes.map((size) => (
                    <tr key={size} className="border-b border-stone-900 hover:bg-stone-900/40">
                      <td className="sticky left-0 bg-stone-950 px-4 py-2.5 text-sm font-bold text-stone-200">{size} pax</td>
                      {room.pricing.map((tier, i) => (
                        <td key={i} className="px-2 py-1.5">
                          <input
                            type="number"
                            value={tier.perPersonRates[size] ?? 0}
                            onChange={(e) => updateRate(i, size, Number(e.target.value))}
                            min={0}
                            className="w-full rounded-lg border border-stone-700 bg-stone-950 px-2 py-1.5 text-right text-sm text-amber-300 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-800 bg-stone-900/80 px-6 py-4 flex flex-col sm:flex-row gap-2 justify-end shrink-0">
          <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
          <ActionButton onClick={handleSave} disabled={uploading}>{uploading ? "Uploading..." : "💾 Save Room"}</ActionButton>
        </div>
      </motion.div>
    </div>
  );
}

// ===================================================================
// UI PRIMITIVES  (café-themed)
// ===================================================================

// ── Café-styled input helpers used in BookingPage ──────────────────
function CafeField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-stone-300">{label}{children}</label>;
}
function CafeInput({ value, onChange, type = "text", placeholder, required, min }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; min?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} required={required} min={min} className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}
function CafeTextarea({ value, onChange, placeholder, rows = 4, required }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required} className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}

// ── Admin/generic inputs (still dark-neutral) ──────────────────────
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm text-stone-300"><span>{label}</span>{children}</label>;
}
function Input({ value, onChange, type = "text", placeholder, required, min }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; min?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} required={required} min={min} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}
function Textarea({ value, onChange, placeholder, rows = 4, required }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
      {options.map((o) => <option key={o} value={o} className="bg-stone-950">{o}</option>)}
    </select>
  );
}
function ActionButton({ children, onClick, type = "button", variant = "primary", className = "", disabled }: { children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; type?: "button" | "submit"; variant?: "primary" | "ghost"; className?: string; disabled?: boolean }) {
  const base = variant === "ghost"
    ? "border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
    : "bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-md shadow-amber-500/20";
  return <button type={type} onClick={onClick} disabled={disabled} className={`rounded-full px-5 py-3 text-sm font-bold tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed ${base} ${className}`}>{children}</button>;
}
function SidebarButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${active ? "bg-amber-400 text-stone-950" : "bg-transparent text-stone-400 hover:bg-stone-800 hover:text-stone-100"}`}>{children}</button>;
}
function StatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
  const tone = status === "Confirmed" || status === "Read"
    ? "border-emerald-600/30 bg-emerald-900/40 text-emerald-300"
    : status === "Completed"
      ? "border-sky-600/30 bg-sky-900/40 text-sky-300"
      : status === "Cancelled" || status === "Archived"
        ? "border-rose-600/30 bg-rose-900/40 text-rose-300"
        : status === "Refunded"
          ? "border-cyan-600/30 bg-cyan-900/40 text-cyan-300"
          : status === "Failed"
            ? "border-stone-600/30 bg-stone-900/40 text-stone-400"
            : "border-amber-600/30 bg-amber-900/40 text-amber-300";
  return <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone} ${compact ? "tracking-[0.15em] uppercase" : ""}`}>{status}</span>;
}
function ListPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6">
      <div><h3 className="text-xl font-serif font-semibold text-stone-100">{title}</h3><p className="mt-1 text-sm text-stone-400">{description}</p></div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function EmptyState({ message }: { message: string }) {
  return <div className="py-8 text-center text-sm text-stone-500">{message}</div>;
}
function ContactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
      <span className="text-stone-500">{label}</span>
      <span className="max-w-xs text-right text-stone-200">{value}</span>
    </div>
  );
}
function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }} transition={{ duration: 0.2 }} className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl shadow-stone-950/60 ${getToneClasses(t.tone)}`}>
            <div className="text-sm font-bold">{t.title}</div>
            {t.description ? <div className="mt-0.5 text-sm opacity-90">{t.description}</div> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default App;
