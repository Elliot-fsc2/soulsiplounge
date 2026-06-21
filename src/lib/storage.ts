import { supabase, isSupabaseConfigured } from "./supabase";

const ROOM_IMAGES_BUCKET = "room-images";
const RECEIPTS_BUCKET = "receipts";
const QR_CODES_BUCKET = "qr-codes";

export async function uploadRoomImage(file: File, roomId: string): Promise<{ url: string; storage: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: await fileToDataUrl(file), storage: false };
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === ROOM_IMAGES_BUCKET)) {
      await supabase.storage.createBucket(ROOM_IMAGES_BUCKET, { public: true });
    }
  } catch { /* ignore */ }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `rooms/${roomId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(ROOM_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (!error) {
    const { data: urlData } = supabase.storage.from(ROOM_IMAGES_BUCKET).getPublicUrl(path);
    return { url: urlData.publicUrl, storage: true };
  }

  // Fallback to data URL if Supabase Storage fails
  return { url: await fileToDataUrl(file), storage: false };
}

export async function uploadReceiptImage(file: File, paymentId: string): Promise<{ url: string; storage: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: await fileToDataUrl(file), storage: false };
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === RECEIPTS_BUCKET)) {
      await supabase.storage.createBucket(RECEIPTS_BUCKET, { public: true });
    }
  } catch { /* ignore */ }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `payments/${paymentId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (!error) {
    const { data: urlData } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
    return { url: urlData.publicUrl, storage: true };
  }

  return { url: await fileToDataUrl(file), storage: false };
}

export async function uploadQrImage(file: File, accountId: string): Promise<{ url: string; storage: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: await fileToDataUrl(file), storage: false };
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === QR_CODES_BUCKET)) {
      await supabase.storage.createBucket(QR_CODES_BUCKET, { public: true });
    }
  } catch { /* ignore */ }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `bank-accounts/${accountId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(QR_CODES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (!error) {
    const { data: urlData } = supabase.storage.from(QR_CODES_BUCKET).getPublicUrl(path);
    return { url: urlData.publicUrl, storage: true };
  }

  return { url: await fileToDataUrl(file), storage: false };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
