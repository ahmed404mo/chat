import { initializeApp, getApps, getApp, cert, deleteApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

function getFirebaseApp() {
  if (getApps().length > 0) return getApp();

  if (!serviceAccountKey) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not set, push notifications disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    return null;
  }
}

export async function sendPushNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  badge?: number,
) {
  const app = getFirebaseApp();
  if (!app || deviceTokens.length === 0) return;

  const messaging = getMessaging(app);

  const messages = deviceTokens.map((token) => ({
    token,
    notification: { title, body },
    android: {
      priority: "high" as const,
      notification: {
        channelId: "mentora-messages",
        priority: "high" as const,
        visibility: "public" as const,
        sound: "default",
        notificationCount: badge || 0,
      },
    },
    data: data || {},
  }));

  const results = await Promise.allSettled(
    messages.map((msg) => messaging.send(msg)),
  );

  const failedTokens: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error("Push send failed for token:", deviceTokens[i], result.reason);
      failedTokens.push(deviceTokens[i]);
    }
  });

  return { failedTokens };
}
