# Meal-Log

A simple meal logging app built around a PT-provided meal plan. No backend, no build step — open `index.html` in a browser, or serve the folder as a static site. Data is saved to the browser's `localStorage`.

## Features

- **Today view**: log one day at a time. Pick a date (defaults to today) and the app shows that day's meal plan automatically:
  - Mon / Wed / Fri / Sat / Sun — Regular Day (Breakfast, Lunch, Dinner, Late Snack)
  - Tue / Thu — Intermittent Fasting Day (Lunch, Snack, Dinner)
- For each meal: log the time you ate (or tap "Now"), record what you actually ate (choose a plan option or describe something else via "Other"), and check off apple cider vinegar (5ml in 150ml water).
- Lunch/Dinner show the planned target per category (e.g. Protein — target 200g) as a reminder, with a free-text field to record what you actually ate for that category.
- **History view**: review the past week or past month. Each day expands to show meal times, what was logged, and ACV check-off status.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Editing the meal plan

The plan is defined in `js/plan.js` (`MealLog.PLANS`). Update the options/categories there if your PT plan changes.
