# Firebase OAuth: authorize the deployed hostname

The frontend reads its Firebase project settings from `firebase-applet-config.json`. Google popup sign-in will fail with `auth/unauthorized-domain` until Firebase Authentication explicitly authorizes the hostname where the web app is opened.

1. Open [Firebase Console](https://console.firebase.google.com/) and select project `cobalt-plating-p01dl`.
2. Open **Authentication → Settings → Authorized domains**.
3. Add the hostname shown in the app's error message. Enter only the hostname (for example, `app.example.com`), not a scheme, port, or path.
4. Add the stable production hostname as well as any specific preview hostname you actively use. Per-deployment Vercel preview URLs may change.
5. Under **Authentication → Sign-in method**, ensure the Google provider is enabled.
6. Reload the deployed app and retry sign-in.

The code can tell you which hostname Firebase rejected, but it cannot authorize that domain from the browser. This requires a Firebase Console project-owner/admin action. Do not place service-account credentials in frontend code.
