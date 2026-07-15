(function () {
  'use strict';

  var state = {
    tab: 'today',
    date: MealLog.today(),
    historyRange: 7
  };

  var appEl = document.getElementById('app');
  var saveTimers = {};

  function debounceSave(mealKey, fn, delay) {
    clearTimeout(saveTimers[mealKey]);
    saveTimers[mealKey] = setTimeout(fn, delay || 300);
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'checked') el.checked = true;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function isMealLogged(mealData) {
    if (!mealData || mealData.skipped) return false;
    return !!(mealData.time && mealData.time.length);
  }

  function isMealSkipped(mealData) {
    return !!(mealData && mealData.skipped);
  }

  function render() {
    appEl.innerHTML = '';
    var nav = h('div', { class: 'tabs' }, [
      h('button', {
        class: 'tab-btn' + (state.tab === 'today' ? ' active' : ''),
        onclick: function () { state.tab = 'today'; render(); }
      }, ['Today']),
      h('button', {
        class: 'tab-btn' + (state.tab === 'history' ? ' active' : ''),
        onclick: function () { state.tab = 'history'; render(); }
      }, ['History'])
    ]);
    appEl.appendChild(nav);

    if (state.tab === 'today') {
      appEl.appendChild(renderToday());
    } else {
      appEl.appendChild(renderHistory());
    }
  }

  // ---------- Today view ----------

  function renderToday() {
    var container = h('div', { class: 'view' }, []);
    var dayRecord = MealLog.getDay(state.date);
    var plan = MealLog.PLANS[dayRecord.dayType];

    var dateBar = h('div', { class: 'date-bar' }, [
      h('button', {
        class: 'icon-btn',
        onclick: function () { state.date = MealLog.addDays(state.date, -1); render(); }
      }, ['‹']),
      h('div', { class: 'date-info' }, [
        h('input', {
          type: 'date',
          class: 'date-input',
          value: state.date,
          onchange: function (e) {
            if (e.target.value) { state.date = e.target.value; render(); }
          }
        }),
        h('div', { class: 'friendly-date' }, [MealLog.friendlyDate(state.date)]),
        h('span', { class: 'day-badge ' + dayRecord.dayType }, [plan.label]),
        h('span', { class: 'week-badge' }, ['Week ' + MealLog.getWeekNumber(state.date)])
      ]),
      h('button', {
        class: 'icon-btn',
        onclick: function () { state.date = MealLog.addDays(state.date, 1); render(); }
      }, ['›'])
    ]);
    container.appendChild(dateBar);

    if (state.date !== MealLog.today()) {
      container.appendChild(h('button', {
        class: 'link-btn',
        onclick: function () { state.date = MealLog.today(); render(); }
      }, ['Jump to today']));
    }

    plan.meals.forEach(function (mealDef) {
      container.appendChild(renderMealCard(mealDef, dayRecord));
    });

    return container;
  }

  function currentTimeStr() {
    var d = new Date();
    return MealLog.pad2(d.getHours()) + ':' + MealLog.pad2(d.getMinutes());
  }

  function renderMealCard(mealDef, dayRecord) {
    var existing = dayRecord.meals[mealDef.key] || {};
    var data = {
      time: existing.time || '',
      selected: existing.selected || '',
      otherText: existing.otherText || '',
      categories: existing.categories || {},
      acv: !!existing.acv,
      skipped: !!existing.skipped
    };

    function persist() {
      MealLog.saveMeal(state.date, mealDef.key, data);
    }

    var logged = isMealLogged(data);
    var card = h('div', {
      class: 'meal-card' + (logged ? ' logged' : '') + (data.skipped ? ' skipped' : '')
    }, []);

    var titleChildren = [mealDef.name];
    if (data.skipped) {
      titleChildren.push(h('span', { class: 'skip-mark' }, [' ⊘ Skipped']));
    } else if (logged) {
      titleChildren.push(h('span', { class: 'check-mark' }, [' ✓']));
    }

    var headerRight;
    if (data.skipped) {
      headerRight = h('button', {
        class: 'undo-skip-btn',
        onclick: function () {
          data.skipped = false;
          persist();
          render();
        }
      }, ['Undo Skip']);
    } else {
      headerRight = h('div', { class: 'time-row' }, [
        h('input', {
          type: 'time',
          class: 'time-input',
          value: data.time,
          onchange: function (e) {
            data.time = e.target.value;
            persist();
            refreshCardLoggedState(card, data);
          }
        }),
        h('button', {
          class: 'now-btn',
          onclick: function (e) {
            data.time = currentTimeStr();
            persist();
            render();
          }
        }, ['Now']),
        h('button', {
          class: 'skip-btn',
          onclick: function () {
            data.skipped = true;
            persist();
            render();
          }
        }, ['Skip'])
      ]);
    }

    var header = h('div', { class: 'meal-header' }, [
      h('h3', {}, titleChildren),
      headerRight
    ]);
    card.appendChild(header);

    if (data.skipped) {
      card.appendChild(h('div', { class: 'skipped-note' }, ['This meal was marked as skipped.']));
      return card;
    }

    if (mealDef.type === 'choice') {
      card.appendChild(renderChoiceBody(mealDef, data, persist));
    } else {
      card.appendChild(renderCategoriesBody(mealDef, data, persist));
    }

    var acvRow = h('label', { class: 'acv-row' }, [
      h('input', {
        type: 'checkbox',
        checked: data.acv ? 'checked' : null,
        onchange: function (e) {
          data.acv = e.target.checked;
          persist();
        }
      }),
      h('span', {}, [' Drank apple cider vinegar (5ml in 150ml water)'])
    ]);
    card.appendChild(acvRow);

    return card;
  }

  function refreshCardLoggedState(card, data) {
    var logged = isMealLogged(data);
    card.classList.toggle('logged', logged);
  }

  function renderChoiceBody(mealDef, data, persist) {
    var wrap = h('div', { class: 'choice-body' }, []);
    var groupName = 'choice-' + mealDef.key + '-' + Math.random().toString(36).slice(2);

    mealDef.options.forEach(function (opt) {
      wrap.appendChild(h('label', { class: 'option-row' }, [
        h('input', {
          type: 'radio',
          name: groupName,
          checked: data.selected === opt.id ? 'checked' : null,
          onchange: function () {
            data.selected = opt.id;
            persist();
            render();
          }
        }),
        h('span', {}, [' ' + opt.label])
      ]));
    });

    wrap.appendChild(h('label', { class: 'option-row' }, [
      h('input', {
        type: 'radio',
        name: groupName,
        checked: data.selected === 'other' ? 'checked' : null,
        onchange: function () {
          data.selected = 'other';
          persist();
          render();
        }
      }),
      h('span', {}, [' Other (describe what you ate)'])
    ]));

    if (data.selected === 'other') {
      wrap.appendChild(h('input', {
        type: 'text',
        class: 'text-input',
        placeholder: 'What did you actually eat?',
        value: data.otherText,
        oninput: function (e) {
          data.otherText = e.target.value;
          debounceSave(mealDef.key, persist);
        }
      }));
    }

    return wrap;
  }

  function renderCategoriesBody(mealDef, data, persist) {
    var wrap = h('div', { class: 'categories-body' }, []);
    mealDef.categories.forEach(function (cat) {
      var targetLabel = cat.target ? (cat.label + ' — target ' + cat.target) : cat.label;
      var entry = data.categories[cat.id];
      if (!entry || typeof entry !== 'object') {
        entry = { food: '', grams: '' };
        data.categories[cat.id] = entry;
      }

      wrap.appendChild(h('div', { class: 'category-row' }, [
        h('label', { class: 'category-label' }, [targetLabel]),
        h('div', { class: 'category-inputs' }, [
          h('input', {
            type: 'text',
            class: 'text-input food-input',
            placeholder: 'What did you eat?',
            value: entry.food,
            oninput: function (e) {
              entry.food = e.target.value;
              debounceSave(mealDef.key + '-' + cat.id + '-food', persist);
            }
          }),
          h('div', { class: 'grams-input-wrap' }, [
            h('input', {
              type: 'number',
              min: '0',
              step: '1',
              inputmode: 'numeric',
              class: 'text-input grams-input',
              placeholder: 'Amount',
              value: entry.grams,
              oninput: function (e) {
                entry.grams = e.target.value;
                debounceSave(mealDef.key + '-' + cat.id + '-grams', persist);
              }
            }),
            h('span', { class: 'unit-label' }, ['g'])
          ])
        ])
      ]));
    });
    return wrap;
  }

  // ---------- History view ----------

  function renderHistory() {
    var container = h('div', { class: 'view' }, []);

    var rangeBar = h('div', { class: 'range-bar' }, [
      h('button', {
        class: 'range-btn' + (state.historyRange === 7 ? ' active' : ''),
        onclick: function () { state.historyRange = 7; render(); }
      }, ['Past Week']),
      h('button', {
        class: 'range-btn' + (state.historyRange === 30 ? ' active' : ''),
        onclick: function () { state.historyRange = 30; render(); }
      }, ['Past Month'])
    ]);
    container.appendChild(rangeBar);

    var entries = MealLog.getRange(state.historyRange);
    var list = h('div', { class: 'history-list' }, []);

    entries.forEach(function (entry) {
      list.appendChild(renderHistoryDay(entry.date, entry.dayRecord));
    });

    container.appendChild(list);
    return container;
  }

  function renderHistoryDay(dateStr, dayRecord) {
    var dayType = dayRecord ? dayRecord.dayType : MealLog.getDayType(dateStr);
    var plan = MealLog.PLANS[dayType];
    var meals = dayRecord ? dayRecord.meals : {};

    var loggedCount = 0;
    var skippedCount = 0;
    var acvCount = 0;
    plan.meals.forEach(function (m) {
      var md = meals[m.key];
      if (isMealLogged(md)) loggedCount++;
      if (isMealSkipped(md)) skippedCount++;
      if (md && md.acv) acvCount++;
    });

    var details = h('div', { class: 'history-details hidden' }, []);
    plan.meals.forEach(function (mealDef) {
      details.appendChild(renderHistoryMeal(mealDef, meals[mealDef.key]));
    });

    var statsChildren = [
      h('span', { class: 'stat' }, [loggedCount + '/' + plan.meals.length + ' meals']),
      h('span', { class: 'stat' }, [acvCount + '/' + plan.meals.length + ' ACV'])
    ];
    if (skippedCount > 0) {
      statsChildren.push(h('span', { class: 'stat' }, [skippedCount + ' skipped']));
    }

    var summary = h('div', { class: 'history-summary' }, [
      h('div', { class: 'history-summary-main' }, [
        h('span', { class: 'history-date' }, [MealLog.friendlyDate(dateStr)]),
        h('span', { class: 'day-badge small ' + dayType }, [plan.label]),
        h('span', { class: 'week-badge small' }, ['Week ' + MealLog.getWeekNumber(dateStr)])
      ]),
      h('div', { class: 'history-summary-stats' }, statsChildren)
    ]);

    var card = h('div', { class: 'history-card' }, [summary, details]);
    summary.addEventListener('click', function () {
      details.classList.toggle('hidden');
    });
    return card;
  }

  function renderHistoryMeal(mealDef, mealData) {
    var rows = [];

    if (isMealSkipped(mealData)) {
      rows.push(h('div', { class: 'hm-header' }, [
        h('strong', {}, [mealDef.name]),
        h('span', { class: 'hm-skipped' }, ['Skipped'])
      ]));
      return h('div', { class: 'hm-block' }, rows);
    }

    rows.push(h('div', { class: 'hm-header' }, [
      h('strong', {}, [mealDef.name]),
      h('span', { class: 'hm-time' }, [mealData && mealData.time ? mealData.time : 'not logged']),
      h('span', { class: 'hm-acv' }, [mealData && mealData.acv ? '✓ ACV' : '— ACV'])
    ]));

    if (mealDef.type === 'choice') {
      var text = '—';
      if (mealData && mealData.selected) {
        if (mealData.selected === 'other') {
          text = mealData.otherText ? ('Other: ' + mealData.otherText) : 'Other (no description)';
        } else {
          var opt = mealDef.options.filter(function (o) { return o.id === mealData.selected; })[0];
          text = opt ? opt.label : mealData.selected;
        }
      }
      rows.push(h('div', { class: 'hm-line' }, [text]));
    } else {
      mealDef.categories.forEach(function (cat) {
        var entry = mealData && mealData.categories ? mealData.categories[cat.id] : null;
        var text = '—';
        if (entry && typeof entry === 'object' && (entry.food || entry.grams)) {
          var parts = [];
          if (entry.food) parts.push(entry.food);
          if (entry.grams) parts.push(entry.grams + 'g');
          text = parts.join(', ');
        }
        rows.push(h('div', { class: 'hm-line' }, [cat.label + ': ' + text]));
      });
    }

    return h('div', { class: 'hm-block' }, rows);
  }

  render();
})();
