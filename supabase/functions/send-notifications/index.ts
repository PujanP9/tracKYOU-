// Sends due rows of notification_queue as web-push messages. Called every minute by pg_cron.
import webpush from "npm:web-push";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_AGE_MS = 2 * 60 * 60 * 1000; // a reminder more than 2 h late is dropped, not sent

Deno.serve(async (_req) => {
  try {
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT")!,          // must start with mailto: or https://
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );
  } catch (e) {
    console.error("VAPID setup failed:", String(e));
    return new Response("VAPID setup failed: " + String(e), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: jobs, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at")
    .limit(100);

  if (error) {
    console.error("queue read failed:", error.message);
    return new Response("queue read failed: " + error.message, { status: 500 });
  }

  let sent = 0, failed = 0, expired = 0, waiting = 0;

  for (const job of jobs ?? []) {
    if (Date.now() - new Date(job.send_at).getTime() > MAX_AGE_MS) {
      await supabase.from("notification_queue")
        .update({ status: "cancelled", error: "expired" }).eq("id", job.id);
      expired++;
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", job.user_id);

    if (!subs || subs.length === 0) { waiting++; continue; } // keep pending until a phone registers

    let delivered = false;
    let lastError = "";
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: job.title, body: job.body, reminderId: job.reminder_id, url: "./" }),
          { TTL: 3600, urgency: "high" },
        );
        delivered = true;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        lastError = `${code ?? ""} ${String((err as Error).message ?? err)}`.trim();
        console.error("push failed:", lastError);
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    if (delivered) {
      await supabase.from("notification_queue")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", job.id);
      sent++;
    } else {
      await supabase.from("notification_queue")
        .update({ status: "failed", error: lastError.slice(0, 300) }).eq("id", job.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed, expired, waiting }), {
    headers: { "Content-Type": "application/json" },
  });
});
