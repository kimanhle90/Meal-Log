// Date helpers and persistence for meal logs.
//
// Persistence goes through a pluggable "store" adapter (MealLog.store) so a
// future backend (e.g. Firestore) can be swapped in via MealLog.setStore()
// without touching this file's higher-level functions (getDay, saveMeal,
// saveWeight, getRange) or anything in app.js.
//
// Adapter contract:
//   readAll()      -> synchronously returns the full data object, keyed by
//                      date string ("YYYY-MM-DD") -> day record.
//   writeAll(data) -> persists the full data object.
// A remote-backed adapter is expected to keep an in-memory mirror of the
// data (kept current via a realtime listener) so readAll() can stay
// synchronous, and to push writeAll()'s changes to the backend in the
// background.

var MealLog = window.MealLog || {};

MealLog.STORAGE_KEY = 'mealLog:days:v1';

function LocalStorageStore(key) {
  this.key = key;
}

LocalStorageStore.prototype.readAll = function () {
  try {
    var raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read meal log storage', e);
    return {};
  }
};

LocalStorageStore.prototype.writeAll = function (data) {
  try {
    localStorage.setItem(this.key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write meal log storage', e);
  }
};

MealLog.LocalStorageStore = LocalStorageStore;

// Swaps the active store adapter. Call this (e.g. from a firebase.js loaded
// after this file but before app.js) to move persistence to a different
// backend without changing any other code.
MealLog.setStore = function (store) {
  MealLog.store = store;
};

MealLog.setStore(new LocalStorageStore(MealLog.STORAGE_KEY));

MealLog.pad2 = function (n) {
  return n < 10 ? '0' + n : '' + n;
};

MealLog.formatDate = function (d) {
  return d.getFullYear() + '-' + MealLog.pad2(d.getMonth() + 1) + '-' + MealLog.pad2(d.getDate());
};

MealLog.parseDate = function (dateStr) {
  var parts = dateStr.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

MealLog.today = function () {
  return MealLog.formatDate(new Date());
};

MealLog.addDays = function (dateStr, delta) {
  var d = MealLog.parseDate(dateStr);
  d.setDate(d.getDate() + delta);
  return MealLog.formatDate(d);
};

MealLog.WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
MEAL_LOG_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
MealLog.MONTH_NAMES = MEAL_LOG_MONTH_NAMES;

MealLog.friendlyDate = function (dateStr) {
  var d = MealLog.parseDate(dateStr);
  return MealLog.WEEKDAY_NAMES[d.getDay()] + ', ' + MealLog.MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
};

// Compact history-row label: "[weekday initial] - [MM.DD.YY]", e.g. "W - 07.15.26".
MealLog.historyDateLabel = function (dateStr) {
  var d = MealLog.parseDate(dateStr);
  var yy = ('' + d.getFullYear()).slice(-2);
  return MealLog.WEEKDAY_NAMES[d.getDay()].charAt(0) + ' - ' +
    MealLog.pad2(d.getMonth() + 1) + '.' + MealLog.pad2(d.getDate()) + '.' + yy;
};

// Split for display hierarchy: a small eyebrow (weekday) above a big headline (month/day/year).
MealLog.friendlyDateParts = function (dateStr) {
  var d = MealLog.parseDate(dateStr);
  return {
    weekday: MealLog.WEEKDAY_NAMES[d.getDay()],
    headline: MealLog.MONTH_NAMES[d.getMonth()] + ' ' + d.getDate(),
    year: '' + d.getFullYear()
  };
};

// Returns the stored day record, or a fresh empty one (not yet persisted).
MealLog.getDay = function (dateStr) {
  var all = MealLog.store.readAll();
  return all[dateStr] || { dayType: MealLog.getDayType(dateStr), meals: {} };
};

MealLog.saveMeal = function (dateStr, mealKey, mealData) {
  var all = MealLog.store.readAll();
  if (!all[dateStr]) {
    all[dateStr] = { dayType: MealLog.getDayType(dateStr), meals: {} };
  }
  all[dateStr].meals[mealKey] = mealData;
  MealLog.store.writeAll(all);
};

MealLog.saveWeight = function (dateStr, weightValue) {
  var all = MealLog.store.readAll();
  if (!all[dateStr]) {
    all[dateStr] = { dayType: MealLog.getDayType(dateStr), meals: {} };
  }
  all[dateStr].weight = weightValue;
  MealLog.store.writeAll(all);
};

// Returns array of { date, dayRecord } for the given number of days ending today (inclusive), most recent first.
MealLog.getRange = function (days) {
  var all = MealLog.store.readAll();
  var result = [];
  var d = MealLog.today();
  for (var i = 0; i < days; i++) {
    result.push({ date: d, dayRecord: all[d] || null });
    d = MealLog.addDays(d, -1);
  }
  return result;
};

window.MealLog = MealLog;
