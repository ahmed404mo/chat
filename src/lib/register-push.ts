export async function registerPushNotifications(token: string | null) {
  if (typeof window === "undefined") return;
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

    PushNotifications.addListener("pushNotificationReceived", () => {});

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data;
      if (data?.conversationId && typeof window !== "undefined") {
        const event = new CustomEvent("navigate-conversation", {
          detail: { conversationId: data.conversationId },
        });
        window.dispatchEvent(event);
      }
    });

    await PushNotifications.register();
  } catch {
    // Not running in Capacitor (browser)
  }
}

export async function unregisterPushNotifications() {
  if (typeof window === "undefined") return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
  } catch {
    // Not running in Capacitor
  }
}
