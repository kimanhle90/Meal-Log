# Meal-Log

A simple meal logging app built around a PT-provided meal plan. No backend, no build step — open `index.html` in a browser, or serve the folder as a static site. Data is saved to the browser's `localStorage`.

## Features

- **Day view (home)**: the main screen shows one day at a time as a list of meal cards, each with a stylized photo tile, name, and status (not logged / logged with time / skipped). Pick a date (defaults to today) and the app shows that day's meal plan automatically, alternating week schedules every calendar week:
  - **Week 1**: Tue / Thu are Intermittent Fasting days (Lunch, Snack, Dinner); the rest of the week is Regular (Breakfast, Lunch, Dinner, Late Snack)
  - **Week 2**: Tue / Thu / Sat are Intermittent Fasting days; the rest of the week is Regular
  - Week 1/Week 2 is anchored to the Monday of the week containing `MealLog.WEEK1_ANCHOR_MONDAY` in `js/plan.js` and alternates from there indefinitely.
- Tapping a meal card opens its own detail screen (with a "‹ Back" link to return home) where you actually log it: the time you ate (or tap "Now"), what you actually ate (choose a plan option or describe something else via "Other"), and check off apple cider vinegar (5ml in 150ml water). You can't log a meal directly from the day view — it's tap-through only.
- Lunch/Dinner show the planned target per category (e.g. Protein — target 200g) as a reminder, with two fields to record what you actually ate: a free-text food description and a number field for the amount in grams.
- **Skip**: on a meal's detail screen, tap "Skip" to mark it skipped instead of logging it. Skipped meals can be undone with "Undo Skip".
- **History**: a link in the top-right corner of the home screen (no tab switcher). Review the past week or past month; each day expands to show meal times, what was logged, ACV check-off status, and which meals (if any) were skipped. A "⌂ Home" link in the top-right returns to today's day view.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Editing the meal plan

The plan is defined in `js/plan.js` (`MealLog.PLANS`). Update the options/categories there if your PT plan changes.
