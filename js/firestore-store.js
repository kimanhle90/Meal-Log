// Firestore-backed store adapter + email/password sign-in.
//
// Data lives at users/{uid}/days/{dateStr}, one document per day, mirroring
// the day-record shape already used by js/storage.js. A realtime listener
// keeps an in-memory cache current so readAll() can stay synchronous (see
// the adapter contract documented at the top of storage.js); writeAll()
// diffs against that cache and only pushes the days that actually changed.
//
// Exposes to app.js:
//   MealLog.getAuthState()      -> 'loading' | 'signed-out' | 'signed-in'
//   MealLog.getCurrentUser()    -> Firebase user object, or null
//   MealLog.onAuthStateChanged(cb) -> cb(user) on every change, plus once immediately
//   MealLog.onDataChanged(cb)   -> cb() whenever the Firestore cache is updated
//   MealLog.signIn(email, password) -> Promise
//   MealLog.signUp(email, password) -> Promise
//   MealLog.signOut()

(function () {
  'use strict';

  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK did not load; the app will fall back to localStorage.');
    return;
  }

  var app = firebase.initializeApp(MealLog.firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  var authState = 'loading';
  var currentUser = null;
  var authListeners = [];
  var dataListeners = [];
  var cache = {};
  var unsubscribeSnapshot = null;

  function notifyAuth() {
    authListeners.forEach(function (cb) { cb(currentUser); });
  }

  function notifyData() {
    dataListeners.forEach(function (cb) { cb(); });
  }

  MealLog.getAuthState = function () {
    return authState;
  };

  MealLog.getCurrentUser = function () {
    return currentUser;
  };

  MealLog.onAuthStateChanged = function (cb) {
    authListeners.push(cb);
    cb(currentUser);
  };

  MealLog.onDataChanged = function (cb) {
    dataListeners.push(cb);
  };

  MealLog.signIn = function (email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  };

  MealLog.signUp = function (email, password) {
    return auth.createUserWithEmailAndPassword(email, password);
  };

  MealLog.signOut = function () {
    return auth.signOut();
  };

  function FirestoreStore(uid) {
    this.collectionRef = db.collection('users').doc(uid).collection('days');
  }

  FirestoreStore.prototype.readAll = function () {
    // Must be a fresh copy, not the live cache: callers (storage.js) mutate
    // the returned object in place and hand it back to writeAll(), which
    // needs to diff it against the still-unmutated cache to know what
    // actually changed.
    //
    // storage.js only ever replaces a whole meal entry (all[date].meals[key]
    // = mealData) or a date's weight/dayType — it never mutates a meal
    // entry's own fields in place. So a 2-level-deep copy (fresh per-date
    // object, fresh .meals object) is all that's needed to isolate cache
    // from those mutations; meal entries themselves can stay shared
    // references. That avoids re-serializing every cached day's full
    // contents (including any embedded photo data URIs) on every read,
    // which otherwise gets slower the more days/photos pile up.
    var copy = {};
    Object.keys(cache).forEach(function (dateStr) {
      var rec = cache[dateStr];
      copy[dateStr] = {
        dayType: rec.dayType,
        weight: rec.weight,
        meals: Object.assign({}, rec.meals)
      };
    });
    return copy;
  };

  // Two day-records are equivalent if every meal entry is the same
  // reference as before — cheap regardless of how large a meal's photo
  // data is, unlike a full JSON.stringify comparison.
  function dayRecordsEqual(a, b) {
    if (a === b) return true;
    if (a.dayType !== b.dayType || a.weight !== b.weight) return false;
    var aMeals = a.meals || {};
    var bMeals = b.meals || {};
    var aKeys = Object.keys(aMeals);
    var bKeys = Object.keys(bMeals);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(function (key) { return aMeals[key] === bMeals[key]; });
  }

  FirestoreStore.prototype.writeAll = function (data) {
    var collectionRef = this.collectionRef;
    Object.keys(data).forEach(function (dateStr) {
      var record = data[dateStr];
      if (cache[dateStr] && dayRecordsEqual(cache[dateStr], record)) {
        return;
      }
      cache[dateStr] = record;
      collectionRef.doc(dateStr).set(record).catch(function (err) {
        console.error('Failed to save "' + dateStr + '" to Firestore', err);
      });
    });
  };

  function startListening(uid) {
    cache = {};
    var collectionRef = db.collection('users').doc(uid).collection('days');
    unsubscribeSnapshot = collectionRef.onSnapshot(function (snapshot) {
      snapshot.docChanges().forEach(function (change) {
        if (change.type === 'removed') {
          delete cache[change.doc.id];
        } else {
          cache[change.doc.id] = change.doc.data();
        }
      });
      notifyData();
    }, function (err) {
      console.error('Firestore listener error', err);
    });
    MealLog.setStore(new FirestoreStore(uid));
  }

  function stopListening() {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    cache = {};
  }

  auth.onAuthStateChanged(function (user) {
    currentUser = user;
    authState = user ? 'signed-in' : 'signed-out';
    if (user) {
      startListening(user.uid);
    } else {
      stopListening();
    }
    notifyAuth();
  });
})();
