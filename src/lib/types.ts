export type View = "home" | "booking" | "contact" | "payment" | "admin";
export type AdminTab = "bookings" | "contacts" | "rooms" | "vouchers" | "analytics" | "payments" | "settings";
export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type ContactStatus = "New" | "Read" | "Archived";
export type PaymentStatus = "Pending" | "Confirmed" | "Cancelled" | "Refunded" | "Failed";
export type ToastTone = "success" | "info" | "warning";
export type Duration = "1.5" | "2" | "3";

export interface RoomPricingTier {
  duration: Duration;
  withCake: boolean;
  perPersonRates: Record<number, number>;
}

export interface RoomItem {
  id: string;
  name: string;
  image: string;
  description: string;
  minGroup: number;
  maxGroup: number;
  pricing: RoomPricingTier[];
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomName: string;
  guestCount: number;
  duration: Duration;
  withCake: boolean;
  date: string;
  time: string;
  perPersonPrice: number;
  totalPrice: number;
  voucherCode: string;
  discountAmount: number;
  finalPrice: number;
  status: BookingStatus;
  notes: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export interface Settings {
  businessName: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  responseTime: string;
  rooms: RoomItem[];
  adminPassword?: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface BookingDraft {
  name: string;
  email: string;
  phone: string;
  roomId: string;
  roomName: string;
  guestCount: number;
  duration: Duration;
  withCake: boolean;
  date: string;
  time: string;
  voucherCode: string;
  appliedDiscount: number;
  status: BookingStatus;
  notes: string;
}

export interface ContactDraft {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export type VoucherType = "percentage" | "fixed";

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  receiptUrl: string;
  status: PaymentStatus;
  notes: string;
  paidAt: string;
  confirmedAt: string;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  email: string;
  password: string;
  role: "admin" | "staff";
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl: string;
  isActive: boolean;
}
