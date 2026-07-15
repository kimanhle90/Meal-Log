(function () {
  'use strict';

  var state = {
    view: 'day', // 'day' | 'meal' | 'history'
    date: MealLog.today(),
    activeMealKey: null,
    historyRange: 7,
    authMode: 'signin', // 'signin' | 'signup'
    authError: null,
    authBusy: false
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

  function getVisual(mealKey) {
    return MealLog.MEAL_VISUALS[mealKey] || { emoji: '🍽️', gradient: 'linear-gradient(135deg, #999, #666)' };
  }

  function currentTimeStr() {
    var d = new Date();
    return MealLog.pad2(d.getHours()) + ':' + MealLog.pad2(d.getMinutes());
  }

  function render() {
    appEl.innerHTML = '';

    if (typeof MealLog.getAuthState === 'function') {
      var authState = MealLog.getAuthState();
      if (authState === 'loading') {
        appEl.appendChild(renderLoadingView());
        return;
      }
      if (authState === 'signed-out') {
        appEl.appendChild(renderSignInView());
        return;
      }
    }

    if (state.view === 'meal') {
      appEl.appendChild(renderMealDetailView());
    } else if (state.view === 'history') {
      appEl.appendChild(renderHistoryView());
    } else {
      appEl.appendChild(renderDayView());
    }
  }

  // ---------- Auth gate ----------

  function renderLoadingView() {
    return h('div', { class: 'view auth-view' }, [
      h('span', { class: 'brand' }, ['Meal Log'])
    ]);
  }

  function renderSignInView() {
    var isSignUp = state.authMode === 'signup';
    var emailInput, passwordInput;

    function submit() {
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      if (!email || !password) {
        state.authError = 'Enter an email and password.';
        render();
        return;
      }
      state.authError = null;
      state.authBusy = true;
      render();

      var action = isSignUp ? MealLog.signUp(email, password) : MealLog.signIn(email, password);
      action.catch(function (err) {
        state.authError = err && err.message ? err.message : 'Something went wrong. Try again.';
      }).then(function () {
        state.authBusy = false;
        render();
      });
    }

    var form = h('form', {
      class: 'auth-form',
      onsubmit: function (e) { e.preventDefault(); submit(); }
    }, []);

    emailInput = h('input', {
      type: 'email',
      class: 'text-input',
      placeholder: 'Email',
      autocomplete: 'email',
      required: 'required',
      value: state.authEmail || '',
      oninput: function (e) { state.authEmail = e.target.value; }
    });
    passwordInput = h('input', {
      type: 'password',
      class: 'text-input',
      placeholder: 'Password',
      autocomplete: isSignUp ? 'new-password' : 'current-password',
      required: 'required',
      value: state.authPassword || '',
      oninput: function (e) { state.authPassword = e.target.value; }
    });

    form.appendChild(emailInput);
    form.appendChild(passwordInput);

    if (state.authError) {
      form.appendChild(h('div', { class: 'auth-error' }, [state.authError]));
    }

    form.appendChild(h('button', {
      class: 'history-link sign-in-btn',
      type: 'submit'
    }, [state.authBusy ? 'Please wait…' : (isSignUp ? 'Create account' : 'Sign in')]));

    return h('div', { class: 'view auth-view' }, [
      h('div', { class: 'auth-card' }, [
        h('div', { class: 'detail-eyebrow' }, ['Meal Log']),
        h('h1', { class: 'page-headline' }, [isSignUp ? 'Create account' : 'Sign in']),
        h('p', { class: 'auth-copy' }, [
          isSignUp
            ? 'Create an account to sync your meal log across devices.'
            : 'Sign in to sync your meal log across devices.'
        ]),
        form,
        h('button', {
          class: 'link-toggle-btn',
          onclick: function () {
            state.authMode = isSignUp ? 'signin' : 'signup';
            state.authError = null;
            render();
          }
        }, [isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'])
      ])
    ]);
  }

  // ---------- Day view (main) ----------

  function renderDayView() {
    var dayRecord = MealLog.getDay(state.date);
    var plan = MealLog.PLANS[dayRecord.dayType];
    var container = h('div', { class: 'view day-view' }, []);

    var topBar = h('div', { class: 'top-bar' }, [
      h('span', { class: 'brand' }, ['Meal Log']),
      h('button', {
        class: 'history-link',
        onclick: function () { state.view = 'history'; render(); }
      }, ['History ›'])
    ]);
    container.appendChild(topBar);

    var dateParts = MealLog.friendlyDateParts(state.date);
    var dateBar = h('div', { class: 'date-bar' }, [
      h('button', {
        class: 'icon-btn',
        onclick: function () { state.date = MealLog.addDays(state.date, -1); render(); }
      }, ['‹']),
      h('div', { class: 'date-info' }, [
        h('div', { class: 'date-subline' }, [
          dateParts.weekday + ', ' + dateParts.headline,
          h('input', {
            type: 'date',
            class: 'date-input',
            value: state.date,
            onchange: function (e) {
              if (e.target.value) { state.date = e.target.value; render(); }
            }
          })
        ]),
        h('div', { class: 'date-headline day-type-' + dayRecord.dayType }, [plan.shortLabel]),
        plan.firstMealHint ? h('div', { class: 'first-meal-hint' }, [plan.firstMealHint]) : null
      ]),
      h('button', {
        class: 'icon-btn',
        onclick: function () { state.date = MealLog.addDays(state.date, 1); render(); }
      }, ['›'])
    ]);
    container.appendChild(dateBar);

    if (state.date !== MealLog.today()) {
      container.appendChild(h('button', {
        class: 'history-link jump-today-btn',
        onclick: function () { state.date = MealLog.today(); render(); }
      }, ['Jump to today']));
    }

    container.appendChild(renderWeightCard(dayRecord));

    var list = h('div', { class: 'meal-list' }, []);
    plan.meals.forEach(function (mealDef) {
      list.appendChild(renderMealSummaryCard(mealDef, dayRecord));
    });
    container.appendChild(list);

    return container;
  }

  function renderWeightCard(dayRecord) {
    var card = h('div', { class: 'weight-card' }, [
      h('span', { class: 'weight-label' }, ['Weight']),
      h('div', { class: 'weight-input-wrap' }, [
        h('input', {
          type: 'number',
          min: '0',
          step: '0.1',
          inputmode: 'decimal',
          class: 'weight-input',
          placeholder: '—',
          value: dayRecord.weight || '',
          oninput: function (e) {
            var v = e.target.value;
            debounceSave('weight', function () {
              MealLog.saveWeight(state.date, v);
            });
          }
        }),
        h('span', { class: 'unit-label' }, ['lb'])
      ])
    ]);
    return card;
  }

  function statusChip(mealData) {
    if (isMealSkipped(mealData)) {
      return h('span', { class: 'chip chip-skipped' }, ['Skipped']);
    }
    if (isMealLogged(mealData)) {
      return h('span', { class: 'chip chip-logged' }, ['✓ ' + mealData.time]);
    }
    return null;
  }

  // Lines of what was actually logged, shown on the day-view card (one item per line).
  function mealSummaryLines(mealDef, mealData) {
    if (!mealData || isMealSkipped(mealData)) return [];

    if (mealDef.type === 'choice') {
      var text;
      if (mealData.selected === 'other') {
        text = mealData.otherText || '';
      } else {
        var opt = mealDef.options.filter(function (o) { return o.id === mealData.selected; })[0];
        text = opt ? opt.label : '';
      }
      return text ? [text] : [];
    }

    var lines = [];
    mealDef.categories.forEach(function (cat) {
      var entry = mealData.categories && mealData.categories[cat.id];
      if (entry && typeof entry === 'object' && (entry.food || entry.grams)) {
        var bits = [];
        if (entry.food) bits.push(entry.food);
        if (entry.grams) bits.push(entry.grams + 'g');
        lines.push(bits.join(' '));
      }
    });
    return lines;
  }

  function renderMealSummaryCard(mealDef, dayRecord) {
    var mealData = dayRecord.meals[mealDef.key];
    var photoUrl = MealLog.MEAL_PHOTOS[mealDef.key];

    var photo = h('div', {
      class: 'meal-photo',
      style: 'background-image:url(' + photoUrl + ')'
    }, []);

    var summaryLines = mealSummaryLines(mealDef, mealData);
    var chip = statusChip(mealData);
    var acvChip = mealData && mealData.acv ? h('span', { class: 'chip chip-acv' }, ['ACV ✓']) : null;

    var infoChildren = [h('h3', {}, [mealDef.name])];
    if (chip || acvChip) {
      infoChildren.push(h('div', { class: 'meal-chip-row' }, [chip, acvChip]));
    }
    summaryLines.forEach(function (line) {
      infoChildren.push(h('div', { class: 'meal-summary-note' }, [line]));
    });

    var content = h('div', { class: 'meal-card-content' }, [
      h('div', { class: 'meal-summary-info' }, infoChildren),
      h('span', { class: 'chevron' }, ['›'])
    ]);

    var card = h('div', {
      class: 'meal-summary-card',
      onclick: function () {
        state.activeMealKey = mealDef.key;
        state.view = 'meal';
        render();
      }
    }, [photo, content]);

    return card;
  }

  // ---------- Meal detail view ----------

  function renderMealDetailView() {
    var dayRecord = MealLog.getDay(state.date);
    var plan = MealLog.PLANS[dayRecord.dayType];
    var mealDef = plan.meals.filter(function (m) { return m.key === state.activeMealKey; })[0];

    if (!mealDef) {
      state.view = 'day';
      return renderDayView();
    }

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

    var visual = getVisual(mealDef.key);
    var container = h('div', { class: 'view meal-detail-view' }, []);

    var topBar = h('div', { class: 'top-bar' }, [
      h('button', {
        class: 'back-btn',
        onclick: function () { state.view = 'day'; render(); }
      }, ['‹ Back']),
      h('span', { class: 'brand' }, [MealLog.friendlyDate(state.date)])
    ]);
    container.appendChild(topBar);

    var hero = h('div', {
      class: 'meal-hero',
      style: 'background:' + visual.gradient
    }, [h('span', { class: 'meal-hero-emoji' }, [visual.emoji])]);
    container.appendChild(hero);

    var body = h('div', { class: 'meal-detail-body' }, []);
    body.appendChild(h('div', { class: 'detail-eyebrow' }, [plan.label]));
    body.appendChild(h('h2', { class: 'meal-detail-title' }, [mealDef.name]));

    var timeRow = h('div', { class: 'time-row' }, [
      h('input', {
        type: 'time',
        class: 'time-input',
        value: data.time,
        onchange: function (e) {
          data.time = e.target.value;
          persist();
        }
      }),
      h('button', {
        class: 'now-btn',
        onclick: function () {
          data.time = currentTimeStr();
          persist();
          render();
        }
      }, ['Now']),
      data.skipped
        ? h('button', {
            class: 'undo-skip-btn',
            onclick: function () { data.skipped = false; persist(); render(); }
          }, ['Undo Skip'])
        : h('button', {
            class: 'skip-btn',
            onclick: function () { data.skipped = true; persist(); render(); }
          }, ['Skip'])
    ]);
    body.appendChild(timeRow);

    if (data.skipped) {
      body.appendChild(h('div', { class: 'skipped-note' }, ['This meal was marked as skipped.']));
    } else {
      if (mealDef.type === 'choice') {
        body.appendChild(renderChoiceBody(mealDef, data, persist));
      } else {
        body.appendChild(renderCategoriesBody(mealDef, data, persist));
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
      body.appendChild(acvRow);
    }

    container.appendChild(body);
    return container;
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

  function renderHistoryView() {
    var container = h('div', { class: 'view history-view' }, []);

    var topBarActions = [
      h('button', {
        class: 'history-link',
        onclick: function () { state.view = 'day'; render(); }
      }, ['⌂ Home'])
    ];
    if (typeof MealLog.signOut === 'function' && MealLog.getCurrentUser()) {
      topBarActions.push(h('button', {
        class: 'history-link',
        onclick: function () { MealLog.signOut(); }
      }, ['Sign out']));
    }

    var topBar = h('div', { class: 'top-bar' }, [
      h('span', { class: 'brand' }, ['Meal Log']),
      h('div', { class: 'top-bar-actions' }, topBarActions)
    ]);
    container.appendChild(topBar);

    container.appendChild(h('div', { class: 'detail-eyebrow' }, ['Your progress']));
    container.appendChild(h('h1', { class: 'page-headline' }, ['History']));

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
    plan.meals.forEach(function (m) {
      var md = meals[m.key];
      if (isMealLogged(md)) loggedCount++;
      if (isMealSkipped(md)) skippedCount++;
    });

    var details = h('div', { class: 'history-details hidden' }, []);
    plan.meals.forEach(function (mealDef) {
      details.appendChild(renderHistoryMeal(mealDef, meals[mealDef.key]));
    });

    var statsChildren = [
      h('span', { class: 'stat' }, [loggedCount + '/' + plan.meals.length + ' meals'])
    ];
    if (dayRecord && dayRecord.weight) {
      statsChildren.push(h('span', { class: 'stat stat-weight' }, [dayRecord.weight + ' lb']));
    }
    if (skippedCount > 0) {
      statsChildren.push(h('span', { class: 'stat' }, [skippedCount + ' skipped']));
    }

    var isEmpty = (loggedCount + skippedCount) === 0;

    var summary = h('div', { class: 'history-summary' }, [
      h('div', { class: 'history-summary-main' }, [
        h('span', { class: 'history-date' }, [MealLog.historyDateLabel(dateStr)]),
        h('span', { class: 'day-badge small ' + dayType }, [plan.label])
      ]),
      h('div', { class: 'history-summary-stats' }, statsChildren)
    ]);

    var card = h('div', { class: 'history-card' + (isEmpty ? ' history-card-empty' : '') }, [summary, details]);
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

  if (typeof MealLog.onAuthStateChanged === 'function') {
    MealLog.onAuthStateChanged(function () { render(); });
  }
  if (typeof MealLog.onDataChanged === 'function') {
    MealLog.onDataChanged(function () { render(); });
  }

  render();
})();
