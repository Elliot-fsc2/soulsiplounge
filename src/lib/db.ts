import { supabase, isSupabaseConfigured } from "./supabase";
import type { Booking, ContactMessage, Payment, BankAccount, RoomItem, Settings, StaffUser, Voucher } from "./types";

class DbError extends Error {
  constructor(msg: string, public cause?: unknown) {
    super(msg);
    this.name = "DbError";
  }
}

function notConfigured(): never {
  throw new DbError("Supabase not configured — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// ── Bookings ──────────────────────────────────────────────────────

export async function checkSlotAvailable(
  date: string,
  roomName: string,
  startTime: string,
  duration: string,
  excludeId?: string
): Promise<{ available: boolean; conflicting?: { id: string; name: string } }> {
  if (!isSupabaseConfigured) return { available: true }; // skip check when Supabase not configured
  const { data, error } = await supabase!.rpc("check_booking_available", {
    p_date: date,
    p_room_name: roomName,
    p_start_time: startTime,
    p_duration: duration,
    p_exclude_id: excludeId ?? null,
  });
  if (error) throw new DbError("Slot check failed", error);
  return data as { available: boolean; conflicting?: { id: string; name: string } };
}

export async function fetchBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("bookings").select("*").order("createdAt", { ascending: false });
  if (error) throw new DbError("Failed to fetch bookings", error);
  return data as Booking[];
}

export async function upsertBooking(booking: Booking): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("bookings").upsert(booking).eq("id", booking.id);
  if (error) throw new DbError("Failed to save booking", error);
}

export async function deleteBooking(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("bookings").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete booking", error);
}

// ── Contacts ──────────────────────────────────────────────────────

export async function fetchContacts(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("contacts").select("*").order("createdAt", { ascending: false });
  if (error) throw new DbError("Failed to fetch contacts", error);
  return data as ContactMessage[];
}

export async function upsertContact(contact: ContactMessage): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("contacts").upsert(contact).eq("id", contact.id);
  if (error) throw new DbError("Failed to save contact", error);
}

export async function updateContactStatus(id: string, status: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("contacts").update({ status }).eq("id", id);
  if (error) throw new DbError("Failed to update contact status", error);
}

export async function deleteContact(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("contacts").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete contact", error);
}

// ── Vouchers ──────────────────────────────────────────────────────

export async function fetchVouchers(): Promise<Voucher[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("vouchers").select("*").order("createdAt", { ascending: false });
  if (error) throw new DbError("Failed to fetch vouchers", error);
  return data as Voucher[];
}

export async function upsertVoucher(voucher: Voucher): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("vouchers").upsert(voucher).eq("id", voucher.id);
  if (error) throw new DbError("Failed to save voucher", error);
}

export async function patchVoucher(id: string, patch: Partial<Voucher>): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("vouchers").update(patch).eq("id", id);
  if (error) throw new DbError("Failed to update voucher", error);
}

export async function deleteVoucher(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("vouchers").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete voucher", error);
}

// ── Rooms + Pricing ───────────────────────────────────────────────

export async function fetchRooms(): Promise<RoomItem[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data: rooms, error: roomsErr } = await supabase!.from("rooms").select("*");
  if (roomsErr) throw new DbError("Failed to fetch rooms", roomsErr);

  const { data: pricing, error: pricingErr } = await supabase!.from("room_pricing").select("*");
  if (pricingErr) throw new DbError("Failed to fetch pricing", pricingErr);

  const pricingByRoom: Record<string, RoomItem["pricing"]> = {};
  for (const p of pricing || []) {
    if (!pricingByRoom[p.roomId]) pricingByRoom[p.roomId] = [];
    pricingByRoom[p.roomId].push({
      duration: p.duration,
      withCake: p.withCake,
      perPersonRates: p.perPersonRates as Record<number, number>,
    });
  }

  return (rooms || []).map((r) => ({
    id: r.id,
    name: r.name,
    image: r.image,
    description: r.description,
    minGroup: r.minGroup,
    maxGroup: r.maxGroup,
    pricing: pricingByRoom[r.id] || [],
  }));
}

export async function saveRoom(room: RoomItem): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error: roomErr } = await supabase!.from("rooms").upsert({
    id: room.id,
    name: room.name,
    image: room.image,
    description: room.description,
    minGroup: room.minGroup,
    maxGroup: room.maxGroup,
  });
  if (roomErr) throw new DbError("Failed to save room", roomErr);

  const { error: delErr } = await supabase!.from("room_pricing").delete().eq("roomId", room.id);
  if (delErr) throw new DbError("Failed to replace pricing", delErr);

  if (room.pricing.length > 0) {
    const { error: insErr } = await supabase!.from("room_pricing").insert(
      room.pricing.map((t) => ({
        roomId: room.id,
        duration: t.duration,
        withCake: t.withCake,
        perPersonRates: t.perPersonRates,
      }))
    );
    if (insErr) throw new DbError("Failed to insert pricing", insErr);
  }
}

export async function deleteRoom(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("rooms").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete room", error);
}

// ── Settings ──────────────────────────────────────────────────────

export async function fetchSettings(): Promise<Settings | null> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("business_settings").select("*").eq("id", "default").maybeSingle();
  if (error) throw new DbError("Failed to fetch settings", error);
  if (!data) return null;

  const rooms = await fetchRooms();
  return {
    businessName: data.businessName,
    tagline: data.tagline,
    description: data.description,
    address: data.address,
    phone: data.phone,
    email: data.email,
    hours: data.hours,
    responseTime: data.responseTime,
    adminPassword: data.adminPassword,
    rooms,
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("business_settings").upsert({
    id: "default",
    businessName: s.businessName,
    tagline: s.tagline,
    description: s.description,
    address: s.address,
    phone: s.phone,
    email: s.email,
    hours: s.hours,
    responseTime: s.responseTime,
    adminPassword: s.adminPassword,
  });
  if (error) throw new DbError("Failed to save settings", error);
}

// ── Seed defaults into empty tables ───────────────────────────────

export async function seedDefaults(
  defaultBookings: Booking[],
  defaultContacts: ContactMessage[],
  defaultSettings: Settings,
  defaultVouchers: Voucher[]
): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();

  const { count: bookingCount, error: bcErr } = await supabase!.from("bookings").select("*", { count: "exact", head: true });
  if (bcErr) throw new DbError("Failed to check bookings", bcErr);

  if (bookingCount === 0 && defaultBookings.length > 0) {
    const { error } = await supabase!.from("bookings").insert(defaultBookings);
    if (error) throw new DbError("Failed to seed bookings", error);
  }

  const { count: contactCount, error: ccErr } = await supabase!.from("contacts").select("*", { count: "exact", head: true });
  if (ccErr) throw new DbError("Failed to check contacts", ccErr);

  if (contactCount === 0 && defaultContacts.length > 0) {
    const { error } = await supabase!.from("contacts").insert(defaultContacts);
    if (error) throw new DbError("Failed to seed contacts", error);
  }

  const { count: settingsCount, error: scErr } = await supabase!.from("business_settings").select("*", { count: "exact", head: true });
  if (scErr) throw new DbError("Failed to check settings", scErr);

  if (settingsCount === 0) {
    const { rooms, ...rest } = defaultSettings;
    const { error } = await supabase!.from("business_settings").insert({ id: "default", ...rest });
    if (error) throw new DbError("Failed to seed settings", error);

    // Seed rooms + pricing
    for (const room of rooms) {
      await saveRoom(room);
    }
  }

  const { count: voucherCount, error: vcErr } = await supabase!.from("vouchers").select("*", { count: "exact", head: true });
  if (vcErr) throw new DbError("Failed to check vouchers", vcErr);

  if (voucherCount === 0 && defaultVouchers.length > 0) {
    const { error } = await supabase!.from("vouchers").insert(defaultVouchers);
    if (error) throw new DbError("Failed to seed vouchers", error);
  }
}

// ── Payments ──────────────────────────────────────────────────────

export async function fetchPayments(): Promise<Payment[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("payments").select("*").order("createdAt", { ascending: false });
  if (error) throw new DbError("Failed to fetch payments", error);
  return data as Payment[];
}

export async function upsertPayment(payment: Payment): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("payments").upsert(payment).eq("id", payment.id);
  if (error) throw new DbError("Failed to save payment", error);
}

export async function updatePaymentStatus(id: string, status: string, confirmedAt: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("payments").update({ status, confirmedAt }).eq("id", id);
  if (error) throw new DbError("Failed to update payment status", error);
}

// ── Bank Accounts ─────────────────────────────────────────────────

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("bank_accounts").select("*").order("bankName", { ascending: true });
  if (error) throw new DbError("Failed to fetch bank accounts", error);
  return data as BankAccount[];
}

export async function upsertBankAccount(account: BankAccount): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("bank_accounts").upsert(account).eq("id", account.id);
  if (error) throw new DbError("Failed to save bank account", error);
}

export async function deleteBankAccount(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("bank_accounts").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete bank account", error);
}

// ── Staff Users ────────────────────────────────────────────────────

export async function fetchStaffUsers(): Promise<StaffUser[]> {
  if (!isSupabaseConfigured) notConfigured();
  const { data, error } = await supabase!.from("staff_users").select("*").order("createdAt", { ascending: true });
  if (error) throw new DbError("Failed to fetch staff users", error);
  return data as StaffUser[];
}

export async function upsertStaffUser(user: StaffUser): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("staff_users").upsert(user).eq("id", user.id);
  if (error) throw new DbError("Failed to save staff user", error);
}

export async function deleteStaffUser(id: string): Promise<void> {
  if (!isSupabaseConfigured) notConfigured();
  const { error } = await supabase!.from("staff_users").delete().eq("id", id);
  if (error) throw new DbError("Failed to delete staff user", error);
}
