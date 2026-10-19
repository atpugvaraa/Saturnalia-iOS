import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableLogs: true,
});

export * from "@sentry/react-native";
export default Sentry;
