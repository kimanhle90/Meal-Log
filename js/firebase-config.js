// Firebase project configuration.
//
// Fill these in with the values from your Firebase project once it exists:
// Firebase console > Project settings > General > Your apps > SDK setup
// and configuration ("Config" option). These values identify your project
// to Firebase but are not secret — access is controlled by Firestore
// security rules, not by hiding this config.
//
// Nothing reads MealLog.firebaseConfig yet. The app still runs entirely on
// localStorage (see js/storage.js) until a Firestore-backed store adapter
// is wired up to use it.

var MealLog = window.MealLog || {};

MealLog.firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

window.MealLog = MealLog;
