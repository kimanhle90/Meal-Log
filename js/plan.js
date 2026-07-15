// Meal plan definition, hardcoded from the PT's Week 1 plan.
// Day types: "regular" (Mon/Wed/Fri/Sat/Sun) and "if" (Tue/Thu, intermittent fasting).

var MealLog = window.MealLog || {};

MealLog.ACV_NOTE = 'Apple cider vinegar: 5ml mixed in 150ml water';

// Visual treatment per meal, used in place of a real photo (card thumbnail + detail hero).
MealLog.MEAL_VISUALS = {
  breakfast: { emoji: '🍳', gradient: 'linear-gradient(135deg, #ffd76e, #ff9a5a)' },
  lunch: { emoji: '🥗', gradient: 'linear-gradient(135deg, #8fd3a0, #4f9d69)' },
  dinner: { emoji: '🍛', gradient: 'linear-gradient(135deg, #f2a65a, #c96a4e)' },
  lateSnack: { emoji: '🍎', gradient: 'linear-gradient(135deg, #ff8fa3, #ff6b6b)' },
  snack: { emoji: '🍇', gradient: 'linear-gradient(135deg, #b28fe0, #7b6ee0)' }
};

MealLog.PLANS = {
  regular: {
    label: 'Regular Day',
    shortLabel: 'Normal Day',
    meals: [
      {
        key: 'breakfast',
        name: 'Breakfast',
        type: 'choice',
        options: [
          { id: 'eggs', label: '2 Eggs' },
          { id: 'whey', label: '1 cup whey' },
          { id: 'egg_yogurt', label: '1 egg & 100g greek yogurt' }
        ]
      },
      {
        key: 'lunch',
        name: 'Lunch',
        type: 'categories',
        categories: [
          { id: 'protein', label: 'Protein', target: '200g' },
          { id: 'veggie', label: 'Vegetables', target: '150g' },
          { id: 'fruit', label: 'Fruit', target: '' }
        ]
      },
      {
        key: 'dinner',
        name: 'Dinner',
        type: 'categories',
        categories: [
          { id: 'carb', label: 'Carb', target: '150g' },
          { id: 'protein', label: 'Protein', target: '150g' },
          { id: 'veggie', label: 'Veggie', target: '150g' },
          { id: 'fruit', label: 'Fruit', target: '' }
        ]
      },
      {
        key: 'lateSnack',
        name: 'Late Snack',
        type: 'choice',
        options: [
          { id: 'yogurt', label: 'Yogurt 100g' },
          { id: 'fruit', label: 'Fruit 100g' }
        ]
      }
    ]
  },
  if: {
    label: 'Intermittent Fasting Day',
    shortLabel: 'IF Day',
    firstMealHint: 'First meal at 12pm',
    meals: [
      {
        key: 'lunch',
        name: 'Lunch',
        type: 'categories',
        categories: [
          { id: 'protein', label: 'Protein', target: '150g' },
          { id: 'veggie', label: 'Veggie', target: '150g' },
          { id: 'fruit', label: 'Fruit', target: '' }
        ]
      },
      {
        key: 'snack',
        name: 'Snack',
        type: 'choice',
        options: [
          { id: 'yogurt', label: 'Yogurt 100g' },
          { id: 'fruit', label: 'Fruit 100g' }
        ]
      },
      {
        key: 'dinner',
        name: 'Dinner',
        type: 'categories',
        categories: [
          { id: 'carb', label: 'Carb', target: '150g' },
          { id: 'protein', label: 'Protein', target: '150g' },
          { id: 'veggie', label: 'Veggie', target: '150g' },
          { id: 'fruit', label: 'Fruit', target: '' }
        ]
      }
    ]
  }
};

// JS Date#getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// Week 1: Tue/Thu are intermittent fasting days.
// Week 2: Tue/Thu/Sat are intermittent fasting days.
// Weeks alternate, anchored to the Monday of the week containing MealLog.WEEK1_ANCHOR_MONDAY.
MealLog.WEEK1_IF_WEEKDAYS = [2, 4];
MealLog.WEEK2_IF_WEEKDAYS = [2, 4, 6];
MealLog.WEEK1_ANCHOR_MONDAY = '2026-07-13';

MealLog.getMondayOfWeek = function (dateStr) {
  var d = MealLog.parseDate(dateStr);
  var day = d.getDay();
  var offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
};

MealLog.getWeekNumber = function (dateStr) {
  var monday = MealLog.getMondayOfWeek(dateStr);
  var anchor = MealLog.getMondayOfWeek(MealLog.WEEK1_ANCHOR_MONDAY);
  var msPerWeek = 7 * 24 * 60 * 60 * 1000;
  var diffWeeks = Math.round((monday.getTime() - anchor.getTime()) / msPerWeek);
  var parity = ((diffWeeks % 2) + 2) % 2;
  return parity === 0 ? 1 : 2;
};

MealLog.getDayType = function (dateStr) {
  var d = MealLog.parseDate(dateStr);
  var day = d.getDay();
  var ifWeekdays = MealLog.getWeekNumber(dateStr) === 1 ? MealLog.WEEK1_IF_WEEKDAYS : MealLog.WEEK2_IF_WEEKDAYS;
  return ifWeekdays.indexOf(day) !== -1 ? 'if' : 'regular';
};

MealLog.getPlanForDate = function (dateStr) {
  return MealLog.PLANS[MealLog.getDayType(dateStr)];
};

window.MealLog = MealLog;
