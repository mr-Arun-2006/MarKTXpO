# Firebase OAuth: authorize the deployed hostname

The frontend reads its Firebase project settings from `firebase-applet-config.json`. This repository is configured for Firebase project **`cobalt-plating-p01dl`** with auth domain **`cobalt-plating-p01dl.firebaseapp.com`**.

1. Open [the Firebase Authentication settings for cobalt-plating-p01dl](https://console.firebase.google.com/project/cobalt-plating-p01dl/authentication/settings).
2. Confirm the Firebase project selector shows **`cobalt-plating-p01dl`**.
3. Open **Authentication → Settings → Authorized domains**.
4. Add the Vercel production hostname **`marktxpocom.vercel.app`** if it is not already listed.
5. Add the exact hostname shown in the app's `auth/unauthorized-domain` message when using a Vercel preview. Enter only the hostname, without `https://`, a port, or a path. Preview hostnames can change between deployments.
6. Under **Authentication → Sign-in method**, ensure Google sign-in is enabled.
7. Save, reload the deployed app, and retry sign-in.

**Important project mismatch:** if the Authorized domains table shows `marktxpo.firebaseapp.com` and `marktxpo.web.app`, you are likely viewing a different Firebase project. Do not change this app's `authDomain` to `marktxpo.firebaseapp.com`; the app's current Firebase app ID, API key, Firestore and Auth configuration belong to `cobalt-plating-p01dl`. Add the Vercel hostnames to the `cobalt-plating-p01dl` project instead.

The browser cannot add an authorized domain. This requires a Firebase Console project-owner/admin action. Do not put service-account credentials in frontend code.
