function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function registerPushNotifications(token: string | null) {
  if (!isCapacitor()) return;
  if (!token) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    PushNotifications.addListener("registration", (pushToken) => {
      const deviceToken = pushToken.value;
      fetch("/api/push/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: deviceToken, platform: "android" }),
      }).catch(() => {});
    });

    try {
      await PushNotifications.createChannel({
        id: "mentora-messages",
        name: "Messages",
        description: "New message notifications",
        importance: 4,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });
    } catch {}

    await PushNotifications.register();

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data;
      if (data?.conversationId && typeof window !== "undefined") {
        const event = new CustomEvent("navigate-conversation", {
          detail: { conversationId: data.conversationId },
        });
        window.dispatchEvent(event);
      }
    });
  } catch {
    // Not running in Capacitor
  }
}
