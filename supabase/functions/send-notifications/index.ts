import webpush from "npm:web-push";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async () => {
  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now)
    .order("send_at")
    .limit(100);

  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;

  for (const job of jobs ?? []) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", job.user_id);

    let delivered = false;

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify({
            title: job.title,
            body: job.body,
            reminderId: job.reminder_id,
            url: "/"
          })
        );
        delivered = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    await supabase
      .from("notification_queue")
      .update({
        status: delivered ? "sent" : "failed",
        sent_at: delivered ? new Date().toISOString() : null
      })
      .eq("id", job.id);

    if (delivered) sent++;
  }

  return Response.json({ ok: true, processed: jobs?.length ?? 0, sent });
});
