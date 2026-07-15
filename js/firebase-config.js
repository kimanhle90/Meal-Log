// Firebase project configuration for the "anhai-meal-log" project /
// "Meal Log Web" app. These values identify the project to Firebase but
// are not secret — access is controlled by Firestore security rules, not
// by hiding this config.
//
// Nothing reads MealLog.firebaseConfig yet. The app still runs entirely on
// localStorage (see js/storage.js) until a Firestore-backed store adapter
// is wired up to use it.

var MealLog = window.MealLog || {};

MealLog.firebaseConfig = {
  apiKey: 'AIzaSyDtgCaNLoHO2Ucu9LBrMQXCK1gdhCjiVBc',
  authDomain: 'anhai-meal-log.firebaseapp.com',
  projectId: 'anhai-meal-log',
  storageBucket: 'anhai-meal-log.firebasestorage.app',
  messagingSenderId: '937310244908',
  appId: '1:937310244908:web:3c5993eeff666be0f18189'
};

window.MealLog = MealLog;
