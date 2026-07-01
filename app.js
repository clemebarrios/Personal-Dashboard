/* ==========================================================================
   WHOOP DASHBOARD INTERACTIVE SCRIPT - WITH GOOGLE CALENDAR & FINANCES
   ========================================================================== */

// Constants
const SVG_CIRCUMFERENCE = 314.159; // 2 * PI * r (r=50)

// Default Initial Data
const defaultState = {
  metrics: {
    recovery: 85,
    activity: 14.2,
    sleep: 90
  },
  todos: [
    { id: 1, text: "Morning meditation", completed: true },
    { id: 2, text: "Complete project proposal", completed: true },
    { id: 3, text: "1-hour workout session", completed: true },
    { id: 4, text: "Read 30 pages", completed: false },
    { id: 5, text: "Review weekly budget", completed: false }
  ],
  habits: [
    { id: 1, name: "Drink 8 glasses of water", days: [true, true, true, false, true, false, false] },
    { id: 2, name: "Exercise 30 mins", days: [true, false, true, false, true, false, false] },
    { id: 3, name: "Meditate", days: [false, false, true, true, false, false, false] },
    { id: 4, name: "Sleep before 10 PM", days: [false, false, false, true, false, true, true] }
  ],
  goals: [
    { id: 1, name: "Run 10km weekly", target: 10, current: 7, unit: "km" },
    { id: 2, name: "Read 2 books this month", target: 2, current: 1.2, unit: "libros" },
    { id: 3, name: "Complete online course", target: 100, current: 75, unit: "%" }
  ],
  portfolio: [
    { id: 1, ticker: "AAPL", qty: 15, avgPrice: 172.50, currentPrice: 189.30 },
    { id: 2, ticker: "TSLA", qty: 10, avgPrice: 220.00, currentPrice: 187.20 },
    { id: 3, ticker: "NVDA", qty: 25, avgPrice: 420.00, currentPrice: 485.50 }
  ],
  transactions: [
    { id: 1, description: "Sueldo Mensual", amount: 3500.00, type: "income", category: "Salario" },
    { id: 2, description: "Compra de Supermercado", amount: 154.30, type: "expense", category: "Alimentación" },
    { id: 3, description: "Suscripción Netflix/Spotify", amount: 22.90, type: "expense", category: "Servicios" },
    { id: 4, description: "Dividendo NVDA", amount: 45.00, type: "income", category: "Dividendos" },
    { id: 5, description: "Gimnasio Mensual", amount: 45.00, type: "expense", category: "Salud" }
  ]
};

// Main State Objects
let state = {};
let localEvents = [];
let googleEvents = [];

// Calendar UI Tracking State
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDateStr = new Date().toISOString().split('T')[0];

// Google Calendar Connection Details
let gcalConfig = { clientId: "", apiKey: "" };
let gcalToken = null;
let gapiInited = false;
let gisInited = false;
let tokenClient = null;

// Chart.js Instance Reference
let portfolioChartInstance = null;

// ==========================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================================================

function loadState() {
  // Load core dashboard data
  const localData = localStorage.getItem("whoop_dashboard_state");
  if (localData) {
    try {
      state = JSON.parse(localData);
      state.metrics = state.metrics || defaultState.metrics;
      state.todos = state.todos || defaultState.todos;
      state.habits = state.habits || defaultState.habits;
      state.goals = state.goals || defaultState.goals;
      state.portfolio = state.portfolio || defaultState.portfolio;
      state.transactions = state.transactions || defaultState.transactions;
    } catch (e) {
      console.error("Error parsing local storage dashboard data, reverting to default.", e);
      state = JSON.parse(JSON.stringify(defaultState));
    }
  } else {
    state = JSON.parse(JSON.stringify(defaultState));
    saveState();
  }

  // Load local calendar events
  const localCalData = localStorage.getItem("whoop_calendar_events");
  if (localCalData) {
    try {
      localEvents = JSON.parse(localCalData);
    } catch (e) {
      console.error("Error parsing local calendar events.", e);
      localEvents = [];
    }
  } else {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const formattedTomorrow = tomorrow.toISOString().split('T')[0];

    localEvents = [
      { id: 1, title: "Evaluación de Desempeño", date: formattedToday, time: "09:30", description: "Revisión trimestral con equipo de diseño.", type: "local" },
      { id: 2, title: "Sesión de HIIT en Gimnasio", date: formattedToday, time: "18:00", description: "Rutina de fuerza y resistencia cardiovascular.", type: "local" },
      { id: 3, title: "Cena familiar", date: formattedTomorrow, time: "20:30", description: "Celebrar cumpleaños.", type: "local" }
    ];
    saveCalendarEvents();
  }

  // Load Google Calendar API Config
  const localGcalConfig = localStorage.getItem("whoop_gcal_config");
  if (localGcalConfig) {
    try {
      gcalConfig = JSON.parse(localGcalConfig);
    } catch (e) {
      console.error("Error parsing Google Calendar API configs.", e);
    }
  }
}

function saveState() {
  localStorage.setItem("whoop_dashboard_state", JSON.stringify(state));
}

function saveCalendarEvents() {
  localStorage.setItem("whoop_calendar_events", JSON.stringify(localEvents));
}

function saveGcalConfig() {
  localStorage.setItem("whoop_gcal_config", JSON.stringify(gcalConfig));
}

// ==========================================================================
// DOM ELEMENTS REFERENCE
// ==========================================================================

const DOM = {
  // Navigation Tabs
  navBtnDashboard: document.getElementById("nav-btn-dashboard"),
  navBtnCalendar: document.getElementById("nav-btn-calendar"),
  navBtnFinances: document.getElementById("nav-btn-finances"),
  
  dashboardGrid: document.querySelector(".dashboard-grid"),
  calendarView: document.getElementById("calendar-view"),
  financesView: document.getElementById("finances-view"),
  mainHeader: document.querySelector(".main-header"),
  
  // Date & Header Title
  currentDate: document.getElementById("current-date"),
  mainTitle: document.querySelector(".main-title"),
  headerActions: document.querySelector(".header-actions"),
  
  // Health Metrics
  ringRecovery: document.getElementById("ring-recovery-fg"),
  ringActivity: document.getElementById("ring-activity-fg"),
  ringSleep: document.getElementById("ring-sleep-fg"),
  valRecovery: document.getElementById("val-recovery"),
  valActivity: document.getElementById("val-activity"),
  valSleep: document.getElementById("val-sleep"),
  
  // To-Dos
  todoCount: document.getElementById("todo-count"),
  todoList: document.getElementById("todo-list"),
  todoForm: document.getElementById("todo-form"),
  newTodoInput: document.getElementById("new-todo-input"),
  
  // Habits
  habitsTbody: document.getElementById("habits-tbody"),
  
  // Goals
  goalsContainer: document.getElementById("goals-list-container"),
  
  // Modals
  metricsModal: document.getElementById("metrics-modal"),
  habitModal: document.getElementById("habit-modal"),
  goalModal: document.getElementById("goal-modal"),
  eventModal: document.getElementById("event-modal"),
  stockModal: document.getElementById("stock-modal"),
  
  // Forms & Inputs
  metricsForm: document.getElementById("metrics-form"),
  inputRecovery: document.getElementById("input-recovery"),
  inputActivity: document.getElementById("input-activity"),
  inputSleep: document.getElementById("input-sleep"),
  
  habitForm: document.getElementById("habit-form"),
  inputHabitName: document.getElementById("input-habit-name"),
  
  goalForm: document.getElementById("goal-form"),
  inputGoalId: document.getElementById("input-goal-id"),
  inputGoalName: document.getElementById("input-goal-name"),
  inputGoalTarget: document.getElementById("input-goal-target"),
  inputGoalCurrent: document.getElementById("input-goal-current"),
  inputGoalUnit: document.getElementById("input-goal-unit"),
  goalModalTitle: document.getElementById("goal-modal-title"),

  eventForm: document.getElementById("event-form"),
  inputEventTitle: document.getElementById("input-event-title"),
  inputEventDate: document.getElementById("input-event-date"),
  inputEventTime: document.getElementById("input-event-time"),
  inputEventDesc: document.getElementById("input-event-description"),
  
  stockForm: document.getElementById("stock-form"),
  inputStockTicker: document.getElementById("input-stock-ticker"),
  inputStockAvgPrice: document.getElementById("input-stock-avg-price"),
  inputStockQty: document.getElementById("input-stock-qty"),
  
  transactionForm: document.getElementById("transaction-form"),
  inputTxDesc: document.getElementById("input-tx-desc"),
  inputTxAmount: document.getElementById("input-tx-amount"),
  inputTxType: document.getElementById("input-tx-type"),
  inputTxCategory: document.getElementById("input-tx-category"),
  
  // Trigger Buttons
  openMetricsBtn: document.getElementById("open-edit-metrics-btn"),
  closeMetricsBtn: document.getElementById("close-metrics-modal-btn"),
  cancelMetricsBtn: document.getElementById("cancel-metrics-modal-btn"),
  
  addHabitBtn: document.getElementById("add-habit-btn"),
  closeHabitBtn: document.getElementById("close-habit-modal-btn"),
  cancelHabitBtn: document.getElementById("cancel-habit-modal-btn"),
  
  addGoalBtn: document.getElementById("add-goal-btn"),
  closeGoalBtn: document.getElementById("close-goal-modal-btn"),
  cancelGoalBtn: document.getElementById("cancel-goal-modal-btn"),

  closeEventModalBtn: document.getElementById("close-event-modal-btn"),
  cancelEventModalBtn: document.getElementById("cancel-event-modal-btn"),

  btnOpenStockModal: document.getElementById("btn-open-stock-modal"),
  closeStockModalBtn: document.getElementById("close-stock-modal-btn"),
  cancelStockModalBtn: document.getElementById("cancel-stock-modal-btn"),

  // Calendar Components
  btnPrevMonth: document.getElementById("btn-prev-month"),
  btnNextMonth: document.getElementById("btn-next-month"),
  calendarMonthTitle: document.getElementById("calendar-month-title"),
  calendarDaysGrid: document.getElementById("calendar-days-grid"),
  btnNewEvent: document.getElementById("btn-new-event"),
  
  // Google Calendar Integration Elements
  gcalStatusBadge: document.getElementById("gcal-status-badge"),
  gcalSetupForm: document.getElementById("gcal-setup-form"),
  gcalClientId: document.getElementById("gcal-client-id"),
  gcalApiKey: document.getElementById("gcal-api-key"),
  btnSaveGcalConfig: document.getElementById("btn-save-gcal-config"),
  gcalActionsPanel: document.getElementById("gcal-actions-panel"),
  btnGcalConnect: document.getElementById("btn-gcal-connect"),
  btnGcalDisconnect: document.getElementById("btn-gcal-disconnect"),
  btnLoadDemoEvents: document.getElementById("btn-load-demo-events"),
  
  // Selected Day Details Elements
  selectedDayLabel: document.getElementById("selected-day-label"),
  selectedDayEventsList: document.getElementById("selected-day-events-list"),
  
  // Finances Components
  stocksTbody: document.getElementById("stocks-tbody"),
  valTotalIncome: document.getElementById("val-total-income"),
  valTotalExpenses: document.getElementById("val-total-expenses"),
  valNetBalance: document.getElementById("val-net-balance"),
  cardNetBalance: document.getElementById("card-net-balance"),
  transactionsList: document.getElementById("transactions-list")
};

// ==========================================================================
// NAVIGATION TAB TOGGLING
// ==========================================================================

function setupNavigation() {
  DOM.navBtnDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    DOM.navBtnDashboard.classList.add("active");
    DOM.navBtnCalendar.classList.remove("active");
    DOM.navBtnFinances.classList.remove("active");
    
    DOM.dashboardGrid.classList.remove("hidden");
    DOM.calendarView.classList.add("hidden");
    DOM.financesView.classList.add("hidden");
    
    DOM.mainTitle.textContent = "MY DAILY DASHBOARD";
    DOM.headerActions.classList.remove("hidden");
  });
  
  DOM.navBtnCalendar.addEventListener("click", (e) => {
    e.preventDefault();
    DOM.navBtnDashboard.classList.remove("active");
    DOM.navBtnCalendar.classList.add("active");
    DOM.navBtnFinances.classList.remove("active");
    
    DOM.dashboardGrid.classList.add("hidden");
    DOM.calendarView.classList.remove("hidden");
    DOM.financesView.classList.add("hidden");
    
    DOM.mainTitle.textContent = "CALENDARIO PERSONAL";
    DOM.headerActions.classList.add("hidden");
    
    renderCalendar();
    renderSelectedDayEvents();
  });
  
  DOM.navBtnFinances.addEventListener("click", (e) => {
    e.preventDefault();
    DOM.navBtnDashboard.classList.remove("active");
    DOM.navBtnCalendar.classList.remove("active");
    DOM.navBtnFinances.classList.add("active");
    
    DOM.dashboardGrid.classList.add("hidden");
    DOM.calendarView.classList.add("hidden");
    DOM.financesView.classList.remove("hidden");
    
    DOM.mainTitle.textContent = "FINANZAS PERSONALES";
    DOM.headerActions.classList.add("hidden");
    
    renderFinances();
  });
}

// ==========================================================================
// UTILITIES & FORMATTING
// ==========================================================================

function updateCurrentDate() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const today = new Date();
  let dateString = today.toLocaleDateString('es-ES', options);
  dateString = dateString.split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
  DOM.currentDate.textContent = dateString;
}

const MONTHS_SPANISH = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ==========================================================================
// RENDERERS (DASHBOARD)
// ==========================================================================

function renderMetrics() {
  const { recovery, activity, sleep } = state.metrics;
  
  DOM.valRecovery.textContent = `${recovery}%`;
  DOM.valActivity.textContent = parseFloat(activity).toFixed(1);
  DOM.valSleep.textContent = `${sleep}%`;

  const recoveryPercent = recovery / 100;
  const recoveryOffset = SVG_CIRCUMFERENCE - (recoveryPercent * SVG_CIRCUMFERENCE);
  DOM.ringRecovery.style.strokeDashoffset = recoveryOffset;

  DOM.ringRecovery.classList.remove("recovery-green", "recovery-yellow", "recovery-red");
  if (recovery >= 67) {
    DOM.ringRecovery.classList.add("recovery-green");
  } else if (recovery >= 34) {
    DOM.ringRecovery.classList.add("recovery-yellow");
  } else {
    DOM.ringRecovery.classList.add("recovery-red");
  }

  const activityPercent = Math.min(Math.max(activity / 21, 0), 1);
  const activityOffset = SVG_CIRCUMFERENCE - (activityPercent * SVG_CIRCUMFERENCE);
  DOM.ringActivity.style.strokeDashoffset = activityOffset;

  const sleepPercent = Math.min(Math.max(sleep / 100, 0), 1);
  const sleepOffset = SVG_CIRCUMFERENCE - (sleepPercent * SVG_CIRCUMFERENCE);
  DOM.ringSleep.style.strokeDashoffset = sleepOffset;
}

function renderTodos() {
  DOM.todoList.innerHTML = "";
  let completedCount = 0;
  
  state.todos.forEach(todo => {
    if (todo.completed) completedCount++;

    const li = document.createElement("li");
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <div class="todo-left" onclick="toggleTodo(${todo.id})">
        <span class="custom-chk"></span>
        <span class="todo-text">${todo.text}</span>
      </div>
      <button class="btn-delete-todo" onclick="deleteTodo(${todo.id})" aria-label="Eliminar tarea">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    DOM.todoList.appendChild(li);
  });

  DOM.todoCount.textContent = `${completedCount}/${state.todos.length}`;
  lucide.createIcons();
}

function renderHabits() {
  DOM.habitsTbody.innerHTML = "";
  
  state.habits.forEach((habit, habitIndex) => {
    const tr = document.createElement("tr");
    
    const habitDetailsTd = document.createElement("td");
    habitDetailsTd.innerHTML = `
      <div class="habit-name-cell">
        <div class="habit-label">
          <i data-lucide="check-square"></i>
          <span>${habit.name}</span>
        </div>
        <button class="btn-delete-habit" onclick="deleteHabit(${habit.id})" title="Eliminar hábito">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    tr.appendChild(habitDetailsTd);
    
    let completedDays = 0;
    habit.days.forEach((dayVal, dayIndex) => {
      if (dayVal) completedDays++;
      
      const dayTd = document.createElement("td");
      dayTd.className = "habit-check-cell";
      dayTd.innerHTML = `
        <div class="habit-circle ${dayVal ? 'completed' : ''}" 
             onclick="toggleHabit(${habitIndex}, ${dayIndex})"></div>
      `;
      tr.appendChild(dayTd);
    });
    
    const progressPercent = Math.round((completedDays / 7) * 100);
    const progressTd = document.createElement("td");
    progressTd.className = "habit-progress-col";
    progressTd.innerHTML = `
      <span class="habit-progress-text ${progressPercent === 100 ? 'perfect' : ''}">
        ${progressPercent}%
      </span>
    `;
    tr.appendChild(progressTd);
    
    DOM.habitsTbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

function renderGoals() {
  DOM.goalsContainer.innerHTML = "";
  
  if (state.goals.length === 0) {
    DOM.goalsContainer.innerHTML = `
      <div style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px 0;">
        No hay metas agregadas aún. Haz clic en "Nueva Meta" para empezar.
      </div>
    `;
    return;
  }
  
  const goalsListDiv = document.createElement("div");
  goalsListDiv.className = "goals-list";

  state.goals.forEach(goal => {
    const hasTarget = goal.target && goal.target > 0;
    const progressPercent = hasTarget ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
    
    const goalItem = document.createElement("div");
    goalItem.className = "goal-item";
    goalItem.innerHTML = `
      <div class="goal-info">
        <span class="goal-title">${goal.name}</span>
        <span class="goal-progress-numbers">
          ${goal.current}${goal.unit ? ' ' + goal.unit : ''} 
          ${hasTarget ? '/ ' + goal.target + (goal.unit ? ' ' + goal.unit : '') : ''}
          ${hasTarget ? ` (${progressPercent}%)` : ''}
        </span>
      </div>
      <div class="goal-progress-bar-container">
        <div class="goal-progress-bar" style="width: ${hasTarget ? progressPercent : 100}%"></div>
      </div>
      <div class="goal-footer">
        <button class="btn-goal-action" onclick="openEditGoalModal(${goal.id})">
          <i data-lucide="edit-3"></i> Editar
        </button>
        <button class="btn-goal-action delete" onclick="deleteGoal(${goal.id})">
          <i data-lucide="trash-2"></i> Eliminar
        </button>
      </div>
    `;
    
    goalsListDiv.appendChild(goalItem);
  });

  DOM.goalsContainer.appendChild(goalsListDiv);
  lucide.createIcons();
}

// ==========================================================================
// RENDERERS (CALENDAR)
// ==========================================================================

function renderCalendar() {
  DOM.calendarMonthTitle.textContent = `${MONTHS_SPANISH[currentMonth]} ${currentYear}`;
  DOM.calendarDaysGrid.innerHTML = "";
  
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDayOfWeek = firstDay.getDay();
  const mondayStartDay = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;
  
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
  
  let cellCount = 0;
  
  // 1. Render padding cells from previous month
  for (let i = prevMonthTotalDays - mondayStartDay + 1; i <= prevMonthTotalDays; i++) {
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYearIdx = currentMonth === 0 ? currentYear - 1 : currentYear;
    const fullDateStr = `${prevYearIdx}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    createDayCell(i, true, fullDateStr);
    cellCount++;
  }
  
  // 2. Render active cells of the current month
  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 1; i <= totalDays; i++) {
    const fullDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = fullDateStr === todayStr;
    const isSelected = fullDateStr === selectedDateStr;
    
    createDayCell(i, false, fullDateStr, isToday, isSelected);
    cellCount++;
  }
  
  // 3. Render padding cells for next month
  let nextMonthDay = 1;
  while (cellCount < 42) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYearIdx = currentMonth === 11 ? currentYear + 1 : currentYear;
    const fullDateStr = `${nextYearIdx}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
    
    createDayCell(nextMonthDay, true, fullDateStr);
    nextMonthDay++;
    cellCount++;
  }

  lucide.createIcons();
}

function createDayCell(dayNum, isInactive, dateStr, isToday = false, isSelected = false) {
  const cell = document.createElement("div");
  cell.className = "calendar-day-cell";
  if (isInactive) cell.classList.add("inactive");
  if (isToday) cell.classList.add("today");
  if (isSelected) cell.classList.add("selected");
  
  cell.setAttribute("data-date", dateStr);
  
  const numSpan = document.createElement("span");
  numSpan.className = "day-number";
  numSpan.textContent = dayNum;
  cell.appendChild(numSpan);
  
  // Hover Add Event Button
  if (!isInactive) {
    const addBtn = document.createElement("div");
    addBtn.className = "cell-add-btn";
    addBtn.innerHTML = "+";
    addBtn.title = "Agregar evento para este día";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.eventForm.reset();
      document.getElementById("input-event-id").value = "";
      document.getElementById("event-modal-title").textContent = "Crear Nuevo Evento";
      document.getElementById("btn-submit-event").textContent = "Crear Evento";
      DOM.inputEventDate.value = dateStr;
      toggleModal(DOM.eventModal, true);
    });
    cell.appendChild(addBtn);
  }
  
  // Event visual tags/badges
  const dayEvents = getEventsForDate(dateStr);
  if (dayEvents.length > 0) {
    const eventsDiv = document.createElement("div");
    eventsDiv.className = "day-events";
    
    dayEvents.slice(0, 2).forEach(evt => {
      const badge = document.createElement("span");
      badge.className = `event-badge ${evt.type}`;
      badge.textContent = evt.title;
      
      if (evt.type === 'local') {
        badge.style.cursor = 'pointer';
        badge.title = "Haz clic para editar este evento";
        badge.addEventListener("click", (e) => {
          e.stopPropagation();
          openEditEventModal(evt.id);
        });
      }
      
      eventsDiv.appendChild(badge);
    });
    
    if (dayEvents.length > 2) {
      const excess = document.createElement("span");
      excess.className = "event-badge";
      excess.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
      excess.style.color = "var(--text-secondary)";
      excess.textContent = `+${dayEvents.length - 2} más`;
      eventsDiv.appendChild(excess);
    }
    
    cell.appendChild(eventsDiv);
  }
  
  if (!isInactive) {
    cell.addEventListener("click", () => {
      document.querySelectorAll(".calendar-day-cell").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");
      
      selectedDateStr = dateStr;
      renderSelectedDayEvents();
    });
    
    cell.addEventListener("dblclick", () => {
      DOM.eventForm.reset();
      document.getElementById("input-event-id").value = "";
      document.getElementById("event-modal-title").textContent = "Crear Nuevo Evento";
      document.getElementById("btn-submit-event").textContent = "Crear Evento";
      DOM.inputEventDate.value = dateStr;
      toggleModal(DOM.eventModal, true);
    });
  }
  
  DOM.calendarDaysGrid.appendChild(cell);
}

function getEventsForDate(dateStr) {
  const allEvents = [...localEvents, ...googleEvents];
  return allEvents.filter(evt => evt.date === dateStr).sort((a, b) => {
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });
}

function renderSelectedDayEvents() {
  const events = getEventsForDate(selectedDateStr);
  
  const dateObj = new Date(selectedDateStr + 'T00:00:00');
  const options = { day: 'numeric', month: 'short' };
  const formattedDate = dateObj.toLocaleDateString('es-ES', options);
  
  const todayStr = new Date().toISOString().split('T')[0];
  if (selectedDateStr === todayStr) {
    DOM.selectedDayLabel.textContent = `Hoy (${formattedDate})`;
  } else {
    DOM.selectedDayLabel.textContent = formattedDate;
  }
  
  DOM.selectedDayEventsList.innerHTML = "";
  
  if (events.length === 0) {
    DOM.selectedDayEventsList.innerHTML = `
      <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">
        No hay eventos agendados para este día.
      </div>
    `;
    return;
  }
  
  events.forEach(evt => {
    const item = document.createElement("div");
    item.className = `event-item ${evt.type === 'google' ? 'google-type' : 'local-type'}`;
    
    if (evt.type === 'local') {
      item.style.cursor = 'pointer';
      item.title = "Haz clic para editar este evento";
      item.addEventListener("click", (e) => {
        if (e.target.closest('.btn-delete-event')) return;
        openEditEventModal(evt.id);
      });
    }
    
    const timeHtml = evt.time ? `
      <span class="event-item-time">
        <i data-lucide="clock"></i> ${evt.time}
      </span>
    ` : '<span class="event-item-time"><i data-lucide="clock"></i> Todo el día</span>';
    
    const deleteBtnHtml = evt.type === 'local' ? `
      <button class="btn-delete-event" onclick="deleteEvent(${evt.id})" title="Eliminar evento">
        <i data-lucide="trash-2"></i>
      </button>
    ` : '';
    
    const descHtml = evt.description ? `
      <p class="event-item-desc">${evt.description}</p>
    ` : '';
    
    item.innerHTML = `
      <div class="event-item-header">
        <span class="event-item-title">${evt.title}</span>
        ${deleteBtnHtml}
      </div>
      ${timeHtml}
      ${descHtml}
    `;
    
    DOM.selectedDayEventsList.appendChild(item);
  });
  
  lucide.createIcons();
}

// ==========================================================================
// RENDERERS (FINANCES)
// ==========================================================================

function renderFinances() {
  renderPortfolioTable();
  renderPortfolioChart();
  renderCashflow();
}

// 1. Portfolio Table
function renderPortfolioTable() {
  DOM.stocksTbody.innerHTML = "";
  
  if (state.portfolio.length === 0) {
    DOM.stocksTbody.innerHTML = `
      <tr>
        <td colspan="7" style="color: var(--text-muted); text-align: center; padding: 24px 0;">
          No tienes acciones registradas. Agrega una para comenzar.
        </td>
      </tr>
    `;
    return;
  }

  state.portfolio.forEach(stock => {
    const totalCost = stock.qty * stock.avgPrice;
    const totalValue = stock.qty * stock.currentPrice;
    const absGain = totalValue - totalCost;
    const pctGain = totalCost > 0 ? (absGain / totalCost) * 100 : 0;
    
    const tr = document.createElement("tr");
    
    const gainClass = absGain >= 0 ? "stock-profit" : "stock-loss";
    const gainSign = absGain >= 0 ? "+" : "";
    
    tr.innerHTML = `
      <td style="font-weight: 700; color: white;">${stock.ticker}</td>
      <td>${stock.qty}</td>
      <td>${formatCurrency(stock.avgPrice)}</td>
      <td>
        <input type="number" class="input-table-edit" value="${stock.currentPrice}" 
               min="0.01" step="0.01" onchange="updateStockPrice(${stock.id}, this.value)">
      </td>
      <td style="font-weight: 600;">${formatCurrency(totalValue)}</td>
      <td class="${gainClass}">
        ${gainSign}${formatCurrency(absGain)} (${gainSign}${pctGain.toFixed(2)}%)
      </td>
      <td>
        <button class="btn-delete-todo" onclick="deleteStock(${stock.id})" title="Eliminar del portafolio">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    DOM.stocksTbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

// 2. Chart.js Portfolio Doughnut Chart
function renderPortfolioChart() {
  const ctx = document.getElementById("portfolio-chart").getContext("2d");
  
  // Destroy old instance if exists to avoid glitchy rendering
  if (portfolioChartInstance) {
    portfolioChartInstance.destroy();
  }
  
  if (state.portfolio.length === 0) {
    // Hide or clean canvas
    return;
  }
  
  const labels = state.portfolio.map(s => s.ticker);
  const dataValues = state.portfolio.map(s => s.qty * s.currentPrice);
  
  // Whoop Palette: green, orange, blue, purple, yellow, cyan
  const colors = ["#00e676", "#ff9100", "#00b0ff", "#d500f9", "#ffea00", "#00e5ff"];
  
  portfolioChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: "#121215", // Match Card background
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#a1a1aa',
            font: {
              family: 'Inter',
              size: 11
            },
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#18181b',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          borderColor: '#1e1e24',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 3. Cash Flow Tracker
function renderCashflow() {
  DOM.transactionsList.innerHTML = "";
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  state.transactions.forEach(tx => {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }
  });
  
  const netBalance = totalIncome - totalExpenses;
  
  DOM.valTotalIncome.textContent = formatCurrency(totalIncome);
  DOM.valTotalExpenses.textContent = formatCurrency(totalExpenses);
  DOM.valNetBalance.textContent = formatCurrency(netBalance);
  
  // Style balance card
  DOM.cardNetBalance.className = "summary-card balance";
  if (netBalance >= 0) {
    DOM.cardNetBalance.classList.add("positive");
  } else {
    DOM.cardNetBalance.classList.add("negative");
  }
  
  // Render History List (reversed to show latest first)
  if (state.transactions.length === 0) {
    DOM.transactionsList.innerHTML = `
      <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px 0;">
        No hay transacciones registradas.
      </div>
    `;
    return;
  }
  
  [...state.transactions].reverse().forEach(tx => {
    const item = document.createElement("div");
    item.className = `tx-item ${tx.type}-type`;
    
    const iconName = tx.type === "income" ? "arrow-up-right" : "arrow-down-left";
    const amountSign = tx.type === "income" ? "+" : "-";
    
    item.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon-badge">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="tx-details">
          <span class="tx-desc">${tx.description}</span>
          <div class="tx-meta">
            <span class="tx-category-tag">${tx.category}</span>
          </div>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount-label">${amountSign}${formatCurrency(tx.amount)}</span>
        <button class="btn-delete-tx" onclick="deleteTransaction(${tx.id})" title="Eliminar movimiento">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
    DOM.transactionsList.appendChild(item);
  });
  
  lucide.createIcons();
}

// ==========================================================================
// TO-DO ACTIONS
// ==========================================================================

window.toggleTodo = function(id) {
  state.todos = state.todos.map(todo => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  saveState();
  renderTodos();
};

window.deleteTodo = function(id) {
  state.todos = state.todos.filter(todo => todo.id !== id);
  saveState();
  renderTodos();
};

DOM.todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = DOM.newTodoInput.value.trim();
  if (text) {
    const newTodo = {
      id: Date.now(),
      text: text,
      completed: false
    };
    state.todos.push(newTodo);
    saveState();
    renderTodos();
    DOM.newTodoInput.value = "";
  }
});

// ==========================================================================
// HABIT ACTIONS
// ==========================================================================

window.toggleHabit = function(habitIndex, dayIndex) {
  state.habits[habitIndex].days[dayIndex] = !state.habits[habitIndex].days[dayIndex];
  saveState();
  renderHabits();
};

window.deleteHabit = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este hábito?")) {
    state.habits = state.habits.filter(h => h.id !== id);
    saveState();
    renderHabits();
  }
};

// ==========================================================================
// GOAL ACTIONS
// ==========================================================================

window.deleteGoal = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar esta meta?")) {
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderGoals();
  }
};

// ==========================================================================
// CALENDAR & LOCAL EVENTS ACTIONS
// ==========================================================================

DOM.btnPrevMonth.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  if (gcalToken) {
    fetchGoogleEvents();
  }
});

DOM.btnNextMonth.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  if (gcalToken) {
    fetchGoogleEvents();
  }
});

window.deleteEvent = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este evento?")) {
    localEvents = localEvents.filter(evt => evt.id !== id);
    saveCalendarEvents();
    renderCalendar();
    renderSelectedDayEvents();
  }
};

// ==========================================================================
// FINANCES ACTIONS
// ==========================================================================

// Stocks Actions
window.updateStockPrice = function(id, newVal) {
  const price = parseFloat(newVal);
  if (!isNaN(price) && price > 0) {
    state.portfolio = state.portfolio.map(s => {
      if (s.id === id) {
        return { ...s, currentPrice: price };
      }
      return s;
    });
    saveState();
    // Render and update chart
    renderPortfolioTable();
    renderPortfolioChart();
  }
};

window.deleteStock = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este activo de tu portafolio?")) {
    state.portfolio = state.portfolio.filter(s => s.id !== id);
    saveState();
    renderFinances();
  }
};

// Cashflow Actions
window.deleteTransaction = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este movimiento financiero?")) {
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    saveState();
    renderCashflow();
  }
};

// ==========================================================================
// MODALS MANAGEMENT & FORM SUBMISSIONS
// ==========================================================================

function toggleModal(modal, show) {
  if (show) {
    modal.classList.add("show");
  } else {
    modal.classList.remove("show");
  }
}

// 1. Health Metrics Modal
DOM.openMetricsBtn.addEventListener("click", () => {
  DOM.inputRecovery.value = state.metrics.recovery;
  DOM.inputActivity.value = state.metrics.activity;
  DOM.inputSleep.value = state.metrics.sleep;
  toggleModal(DOM.metricsModal, true);
});

const closeMetrics = () => toggleModal(DOM.metricsModal, false);
DOM.closeMetricsBtn.addEventListener("click", closeMetrics);
DOM.cancelMetricsBtn.addEventListener("click", closeMetrics);

DOM.metricsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.metrics.recovery = parseInt(DOM.inputRecovery.value);
  state.metrics.activity = parseFloat(DOM.inputActivity.value);
  state.metrics.sleep = parseInt(DOM.inputSleep.value);
  
  saveState();
  renderMetrics();
  closeMetrics();
});

// 2. Habit Modal
DOM.addHabitBtn.addEventListener("click", () => {
  DOM.habitForm.reset();
  toggleModal(DOM.habitModal, true);
});

const closeHabit = () => toggleModal(DOM.habitModal, false);
DOM.closeHabitBtn.addEventListener("click", closeHabit);
DOM.cancelHabitBtn.addEventListener("click", closeHabit);

DOM.habitForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = DOM.inputHabitName.value.trim();
  if (name) {
    const newHabit = {
      id: Date.now(),
      name: name,
      days: [false, false, false, false, false, false, false]
    };
    state.habits.push(newHabit);
    saveState();
    renderHabits();
    closeHabit();
  }
});

// 3. Goal Modal
DOM.addGoalBtn.addEventListener("click", () => {
  DOM.goalForm.reset();
  DOM.inputGoalId.value = "";
  DOM.goalModalTitle.textContent = "Agregar Nueva Meta";
  toggleModal(DOM.goalModal, true);
});

window.openEditGoalModal = function(id) {
  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    DOM.inputGoalId.value = goal.id;
    DOM.inputGoalName.value = goal.name;
    DOM.inputGoalTarget.value = goal.target || "";
    DOM.inputGoalCurrent.value = goal.current;
    DOM.inputGoalUnit.value = goal.unit || "";
    DOM.goalModalTitle.textContent = "Editar Meta";
    toggleModal(DOM.goalModal, true);
  }
};

const closeGoal = () => toggleModal(DOM.goalModal, false);
DOM.closeGoalBtn.addEventListener("click", closeGoal);
DOM.cancelGoalBtn.addEventListener("click", closeGoal);

DOM.goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = DOM.inputGoalId.value;
  const name = DOM.inputGoalName.value.trim();
  const target = DOM.inputGoalTarget.value ? parseFloat(DOM.inputGoalTarget.value) : null;
  const current = parseFloat(DOM.inputGoalCurrent.value) || 0;
  const unit = DOM.inputGoalUnit.value.trim() || null;

  if (name) {
    if (id) {
      state.goals = state.goals.map(g => {
        if (g.id == id) {
          return { ...g, name, target, current, unit };
        }
        return g;
      });
    } else {
      const newGoal = {
        id: Date.now(),
        name,
        target,
        current,
        unit
      };
      state.goals.push(newGoal);
    }
    saveState();
    renderGoals();
    closeGoal();
  }
});

// 4. Calendar Event Modal
DOM.btnNewEvent.addEventListener("click", () => {
  DOM.eventForm.reset();
  document.getElementById("input-event-id").value = "";
  document.getElementById("event-modal-title").textContent = "Crear Nuevo Evento";
  document.getElementById("btn-submit-event").textContent = "Crear Evento";
  DOM.inputEventDate.value = selectedDateStr;
  toggleModal(DOM.eventModal, true);
});

window.openEditEventModal = function(id) {
  const evt = localEvents.find(e => e.id === id);
  if (evt) {
    document.getElementById("input-event-id").value = evt.id;
    DOM.inputEventTitle.value = evt.title;
    DOM.inputEventDate.value = evt.date;
    DOM.inputEventTime.value = evt.time || "";
    DOM.inputEventDesc.value = evt.description || "";
    document.getElementById("event-modal-title").textContent = "Editar Evento";
    document.getElementById("btn-submit-event").textContent = "Guardar Cambios";
    toggleModal(DOM.eventModal, true);
  }
};

const closeEventModal = () => toggleModal(DOM.eventModal, false);
DOM.closeEventModalBtn.addEventListener("click", closeEventModal);
DOM.cancelEventModalBtn.addEventListener("click", closeEventModal);

DOM.eventForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("input-event-id").value;
  const title = DOM.inputEventTitle.value.trim();
  const date = DOM.inputEventDate.value;
  const time = DOM.inputEventTime.value || null;
  const description = DOM.inputEventDesc.value.trim() || null;
  
  if (title && date) {
    if (id) {
      localEvents = localEvents.map(evt => {
        if (evt.id == id) {
          return { ...evt, title, date, time, description };
        }
        return evt;
      });
    } else {
      const newEvt = {
        id: Date.now(),
        title,
        date,
        time,
        description,
        type: "local"
      };
      localEvents.push(newEvt);
    }
    
    saveCalendarEvents();
    renderCalendar();
    renderSelectedDayEvents();
    closeEventModal();
  }
});

// 5. Stock Entry Modal
DOM.btnOpenStockModal.addEventListener("click", () => {
  DOM.stockForm.reset();
  toggleModal(DOM.stockModal, true);
});

const closeStockModal = () => toggleModal(DOM.stockModal, false);
DOM.closeStockModalBtn.addEventListener("click", closeStockModal);
DOM.cancelStockModalBtn.addEventListener("click", closeStockModal);

DOM.stockForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const ticker = DOM.inputStockTicker.value.trim().toUpperCase();
  const avgPrice = parseFloat(DOM.inputStockAvgPrice.value);
  const qty = parseFloat(DOM.inputStockQty.value);
  
  if (ticker && avgPrice > 0 && qty > 0) {
    const newStock = {
      id: Date.now(),
      ticker: ticker,
      avgPrice: avgPrice,
      qty: qty,
      currentPrice: avgPrice // Initially equal to buy price
    };
    state.portfolio.push(newStock);
    saveState();
    
    renderFinances();
    closeStockModal();
  }
});

// 6. Transaction Form Submission (Cashflow)
DOM.transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const desc = DOM.inputTxDesc.value.trim();
  const amount = parseFloat(DOM.inputTxAmount.value);
  const type = DOM.inputTxType.value;
  const category = DOM.inputTxCategory.value.trim();
  
  if (desc && amount > 0 && type && category) {
    const newTx = {
      id: Date.now(),
      description: desc,
      amount: amount,
      type: type,
      category: category
    };
    state.transactions.push(newTx);
    saveState();
    
    renderCashflow();
    DOM.transactionForm.reset();
  }
});

// Global modal clicks
window.addEventListener("click", (e) => {
  if (e.target === DOM.metricsModal) closeMetrics();
  if (e.target === DOM.habitModal) closeHabit();
  if (e.target === DOM.goalModal) closeGoal();
  if (e.target === DOM.eventModal) closeEventModal();
  if (e.target === DOM.stockModal) closeStockModal();
});

// ==========================================================================
// GOOGLE CALENDAR API INTEGRATION (OAUTH2 + GAPI)
// ==========================================================================

function initGcalConfigUI() {
  if (gcalConfig.clientId && gcalConfig.apiKey) {
    DOM.gcalClientId.value = gcalConfig.clientId;
    DOM.gcalApiKey.value = gcalConfig.apiKey;
    
    DOM.gcalSetupForm.classList.add("hidden");
    DOM.gcalActionsPanel.classList.remove("hidden");
  }

  DOM.btnSaveGcalConfig.addEventListener("click", () => {
    const cId = DOM.gcalClientId.value.trim();
    const aKey = DOM.gcalApiKey.value.trim();
    
    if (cId && aKey) {
      gcalConfig.clientId = cId;
      gcalConfig.apiKey = aKey;
      saveGcalConfig();
      
      DOM.gcalSetupForm.classList.add("hidden");
      DOM.gcalActionsPanel.classList.remove("hidden");
      
      attemptGapiInit();
      attemptGisInit();
    } else {
      alert("Por favor ingresa un Client ID y una API Key válidos.");
    }
  });

  DOM.btnGcalConnect.addEventListener("click", connectGcal);
  DOM.btnGcalDisconnect.addEventListener("click", disconnectGcal);
}

window.gapiLoaded = function() {
  gapi.load('client', attemptGapiInit);
};

window.gisLoaded = function() {
  attemptGisInit();
};

function attemptGapiInit() {
  if (typeof gapi !== 'undefined' && gcalConfig.apiKey) {
    gapi.client.init({
      apiKey: gcalConfig.apiKey,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    }).then(() => {
      gapiInited = true;
      console.log("Google API Client successfully initialized.");
      if (gcalToken) {
        gapi.client.setToken(gcalToken);
      }
    }).catch(err => {
      console.error("Error initializing GAPI client", err);
    });
  }
}

function attemptGisInit() {
  if (typeof google !== 'undefined' && gcalConfig.clientId) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: gcalConfig.clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          console.error("GIS Authentication Error", tokenResponse);
          alert("Error de autenticación con Google: " + tokenResponse.error);
          return;
        }
        
        gcalToken = tokenResponse;
        gapi.client.setToken(tokenResponse);
        
        DOM.gcalStatusBadge.textContent = "Conectado";
        DOM.gcalStatusBadge.className = "status-indicator connected";
        
        DOM.btnGcalConnect.classList.add("hidden");
        DOM.btnGcalDisconnect.classList.remove("hidden");
        
        fetchGoogleEvents();
      },
    });
    gisInited = true;
    console.log("Google Identity Services successfully initialized.");
  }
}

function connectGcal() {
  if (!gisInited || !tokenClient) {
    alert("Google Identity Services no está listo. Asegúrate de configurar un Client ID válido.");
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function disconnectGcal() {
  if (gcalToken && gcalToken.access_token) {
    google.accounts.oauth2.revoke(gcalToken.access_token, () => {
      gcalToken = null;
      googleEvents = [];
      
      DOM.gcalStatusBadge.textContent = "Desconectado";
      DOM.gcalStatusBadge.className = "status-indicator disconnected";
      
      DOM.btnGcalConnect.classList.remove("hidden");
      DOM.btnGcalDisconnect.classList.add("hidden");
      
      renderCalendar();
      renderSelectedDayEvents();
      console.log("Access token revoked successfully.");
    });
  } else {
    googleEvents = [];
    DOM.gcalStatusBadge.textContent = "Desconectado";
    DOM.gcalStatusBadge.className = "status-indicator disconnected";
    
    DOM.btnGcalConnect.classList.remove("hidden");
    DOM.btnGcalDisconnect.classList.add("hidden");
    
    renderCalendar();
    renderSelectedDayEvents();
  }
}

function fetchGoogleEvents() {
  if (!gapiInited || !gcalToken) return;
  
  const timeMin = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const timeMax = new Date(currentYear, currentMonth + 2, 0).toISOString();
  
  gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  }).then(response => {
    const items = response.result.items || [];
    googleEvents = items.map(item => {
      const startDateTime = item.start.dateTime || item.start.date;
      const dateParts = startDateTime.split('T');
      
      let date = dateParts[0];
      let time = null;
      if (dateParts[1]) {
        time = dateParts[1].substring(0, 5);
      }
      
      return {
        id: item.id,
        title: item.summary || "Evento sin título",
        date: date,
        time: time,
        description: item.description || null,
        type: "google"
      };
    });
    
    renderCalendar();
    renderSelectedDayEvents();
    console.log(`Fetched ${googleEvents.length} events from Google Calendar.`);
  }).catch(err => {
    console.error("Error retrieving calendar events", err);
    alert("Error al cargar eventos de Google Calendar. Revisa tus API keys o el estado de tu cuenta.");
  });
}

function loadDemoEvents() {
  const baseYear = currentYear;
  const baseMonth = String(currentMonth + 1).padStart(2, '0');
  
  const mockGcalEvents = [
    { id: "g1", title: "Google: Reunión de Sincronización", date: `${baseYear}-${baseMonth}-08`, time: "10:00", description: "Sincronización semanal de producto en Google Meet.", type: "google" },
    { id: "g2", title: "Google: 1:1 con Manager", date: `${baseYear}-${baseMonth}-12`, time: "15:30", description: "Seguimiento de carrera y feedback.", type: "google" },
    { id: "g3", title: "Google: Lanzamiento de Beta", date: `${baseYear}-${baseMonth}-15`, time: "09:00", description: "Despliegue y monitoreo de la nueva versión.", type: "google" },
    { id: "g4", title: "Google: Almuerzo de Equipo", date: `${baseYear}-${baseMonth}-22`, time: "13:30", description: "Compartir comida mensual.", type: "google" }
  ];
  
  googleEvents = mockGcalEvents;
  
  DOM.gcalStatusBadge.textContent = "Demo Conectado";
  DOM.gcalStatusBadge.className = "status-indicator connected";
  DOM.gcalActionsPanel.classList.remove("hidden");
  DOM.btnGcalConnect.classList.add("hidden");
  DOM.btnGcalDisconnect.classList.remove("hidden");
  DOM.gcalSetupForm.classList.add("hidden");
  
  renderCalendar();
  renderSelectedDayEvents();
  alert("Eventos demo de Google cargados con éxito para " + MONTHS_SPANISH[currentMonth] + ".");
}

// ==========================================================================
// APPLICATION INITIALIZATION
// ==========================================================================

function init() {
  loadState();
  updateCurrentDate();
  renderAll();
  
  // Tabs & Sidebar Navigation
  setupNavigation();
  
  // Google Calendar Connection Config
  initGcalConfigUI();
  
  DOM.btnLoadDemoEvents.addEventListener("click", loadDemoEvents);

  // Check for local file protocol origin oauth restriction
  if (window.location.protocol === 'file:') {
    const warningBanner = document.getElementById("gcal-protocol-warning");
    if (warningBanner) {
      warningBanner.classList.remove("hidden");
    }
  }
}

// Render all dashboard items
function renderAll() {
  renderMetrics();
  renderTodos();
  renderHabits();
  renderGoals();
}

init();
