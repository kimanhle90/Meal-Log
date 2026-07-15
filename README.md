# Meal-Log

A simple meal logging app built around a PT-provided meal plan. No backend, no build step — open `index.html` in a browser, or serve the folder as a static site. Data is saved to the browser's `localStorage`.

## Features

- **Today view**: log one day at a time. Pick a date (defaults to today) and the app shows that day's meal plan automatically, alternating week schedules every calendar week:
  - **Week 1**: Tue / Thu are Intermittent Fasting days (Lunch, Snack, Dinner); the rest of the week is Regular (Breakfast, Lunch, Dinner, Late Snack)
  - **Week 2**: Tue / Thu / Sat are Intermittent Fasting days; the rest of the week is Regular
  - Week 1/Week 2 is anchored to the Monday of the week containing `MealLog.WEEK1_ANCHOR_MONDAY` in `js/plan.js` and alternates from there indefinitely.
- For each meal: log the time you ate (or tap "Now"), record what you actually ate (choose a plan option or describe something else via "Other"), and check off apple cider vinegar (5ml in 150ml water).
- Lunch/Dinner show the planned target per category (e.g. Protein — target 200g) as a reminder, with two fields to record what you actually ate: a free-text food description and a number field for the amount in grams.
- **Skip**: if you miss a meal, tap "Skip" on that meal's card to mark it skipped instead of logging it. Skipped meals can be undone with "Undo Skip".
- **History view**: review the past week or past month. Each day expands to show meal times, what was logged, ACV check-off status, and which meals (if any) were skipped.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Editing the meal plan

The plan is defined in `js/plan.js` (`MealLog.PLANS`). Update the options/categories there if your PT plan changes.
