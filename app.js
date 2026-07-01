// Dynamic clock and greeting update
function updateClock() {
  const clockElement = document.getElementById('clock-display');
  const dateElement = document.getElementById('date-display');
  const greetingElement = document.getElementById('greeting-text');

  if (!clockElement || !dateElement) return;

  const now = new Date();
  
  // Format Time (HH:MM:SS)
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  clockElement.textContent = now.toLocaleTimeString('es-ES', timeOptions);

  // Format Date (DayOfWeek, Day of Month MonthName)
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  let dateStr = now.toLocaleDateString('es-ES', dateOptions);
  // Capitalize first letter
  dateElement.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Update greeting text based on hour
  const hours = now.getHours();
  let greeting = '¡Hola!';
  if (hours >= 6 && hours < 12) {
    greeting = 'Buenos días';
  } else if (hours >= 12 && hours < 20) {
    greeting = 'Buenas tardes';
  } else {
    greeting = 'Buenas noches';
  }
  
  if (greetingElement) {
    greetingElement.textContent = `${greeting}, Clemente`;
  }
}

// ------------------------------
// To-Do Task Manager List
// ------------------------------
let tasks = JSON.parse(localStorage.getItem('dashboard-tasks')) || [
  { id: 1, text: 'Personalizar este Dashboard', completed: false },
  { id: 2, text: 'Vincular repositorio de GitHub', completed: true },
  { id: 3, text: 'Desplegar en producción', completed: false }
];

function saveTasks() {
  localStorage.setItem('dashboard-tasks', JSON.stringify(tasks));
}

function renderTasks() {
  const todoList = document.getElementById('todo-list');
  if (!todoList) return;
  
  todoList.innerHTML = '';
  
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `todo-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    
    li.innerHTML = `
      <div class="todo-item-left" onclick="toggleTask(${task.id})">
        <div class="checkbox-custom">
          <svg viewBox="0 0 24 24"><path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="todo-text">${escapeHTML(task.text)}</span>
      </div>
      <button class="btn-delete" onclick="deleteTask(event, ${task.id})" aria-label="Eliminar tarea">
        <svg viewBox="0 0 24 24"><path d="M19 7L5 7M10 11V17M14 11V17M16 7V4C16 3.44772 15.5523 3 15 3H9C8.44772 3 8 3.44772 8 4V7M18 7V20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20V7H18Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    `;
    todoList.appendChild(li);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function addTask() {
  const input = document.getElementById('todo-input');
  if (!input) return;
  
  const text = input.value.trim();
  if (text === '') return;
  
  const newTask = {
    id: Date.now(),
    text: text,
    completed: false
  };
  
  tasks.push(newTask);
  saveTasks();
  renderTasks();
  input.value = '';
}

function toggleTask(id) {
  tasks = tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveTasks();
  renderTasks();
}

function deleteTask(event, id) {
  event.stopPropagation();
  const item = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (item) {
    item.style.transform = 'translateX(20px)';
    item.style.opacity = '0';
    setTimeout(() => {
      tasks = tasks.filter(task => task.id !== id);
      saveTasks();
      renderTasks();
    }, 250);
  }
}

// ------------------------------
// Focus / Pomodoro Timer Widget
// ------------------------------
let timerInterval = null;
let timerTimeLeft = 25 * 60; // 25 minutes
let timerIsRunning = false;
let timerMode = 'work'; // 'work' or 'break'

function updateTimerDisplay() {
  const timeElement = document.getElementById('timer-time');
  const progressCircle = document.getElementById('timer-progress');
  if (!timeElement || !progressCircle) return;
  
  const minutes = Math.floor(timerTimeLeft / 60);
  const seconds = timerTimeLeft % 60;
  
  timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate progress circle offset
  const total = timerMode === 'work' ? 25 * 60 : 5 * 60;
  const progress = (total - timerTimeLeft) / total;
  const circumference = 471.2; // 2 * pi * 75
  progressCircle.style.strokeDashoffset = circumference * progress;
}

function toggleTimer() {
  const playBtn = document.getElementById('btn-play-pause');
  if (!playBtn) return;
  
  if (timerIsRunning) {
    clearInterval(timerInterval);
    timerIsRunning = false;
    playBtn.textContent = 'Iniciar';
    playBtn.classList.remove('btn-primary');
  } else {
    timerIsRunning = true;
    playBtn.textContent = 'Pausar';
    playBtn.classList.add('btn-primary');
    
    timerInterval = setInterval(() => {
      timerTimeLeft--;
      if (timerTimeLeft < 0) {
        clearInterval(timerInterval);
        timerIsRunning = false;
        playBtn.textContent = 'Iniciar';
        playBtn.classList.remove('btn-primary');
        alertTimerFinished();
        switchTimerMode();
      }
      updateTimerDisplay();
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerIsRunning = false;
  timerTimeLeft = timerMode === 'work' ? 25 * 60 : 5 * 60;
  
  const playBtn = document.getElementById('btn-play-pause');
  if (playBtn) {
    playBtn.textContent = 'Iniciar';
    playBtn.classList.remove('btn-primary');
  }
  
  updateTimerDisplay();
}

function switchTimerMode() {
  const modeText = document.getElementById('timer-mode-text');
  if (timerMode === 'work') {
    timerMode = 'break';
    timerTimeLeft = 5 * 60;
    if (modeText) modeText.textContent = 'Descanso';
  } else {
    timerMode = 'work';
    timerTimeLeft = 25 * 60;
    if (modeText) modeText.textContent = 'Enfoque';
  }
  updateTimerDisplay();
}

function alertTimerFinished() {
  // Try to play alert sound or trigger browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Session Complete!', {
      body: timerMode === 'work' ? 'Time for a break!' : 'Time to focus!'
    });
  } else {
    alert(timerMode === 'work' ? '¡Sesión de enfoque completada! Hora de un descanso.' : '¡Descanso terminado! Hora de enfocarse.');
  }
}

// ------------------------------
// Initialization
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Start clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Render To-Do items
  renderTasks();
  
  // Initialize Pomodoro Display
  updateTimerDisplay();
  
  // Bind input keypress
  const todoInput = document.getElementById('todo-input');
  if (todoInput) {
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });
  }
  
  // Ask for browser notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
