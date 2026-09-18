# DailyTask — To-Do / Daily Task Website

A complete frontend-only task manager made with **HTML, CSS and vanilla JavaScript**.

## Features
- Calendar with month navigation
- Date-wise tasks
- Add / Edit / Delete tasks
- Mark task Complete / Pending
- Task title, date, time, priority, category and notes
- Search tasks
- Filter: All / Pending / Completed / High priority
- Sort by time / priority / recently added
- Daily progress percentage
- Total / Completed / Pending / Today's task counters
- Upcoming pending tasks
- Today button
- Dark mode
- Export tasks as JSON backup
- Import tasks from JSON backup
- Responsive mobile layout
- Data stored in browser localStorage
- No backend, database, npm package or API required

## Run locally
Open `index.html` with VS Code Live Server.

Example:
`http://127.0.0.1:5500/index.html`

## Data storage
Tasks are saved in the browser's `localStorage`.
Therefore:
- Refreshing the page does not remove tasks.
- Closing and reopening the browser normally keeps tasks.
- Different browser/device has separate localStorage.
- Clearing browser site data can remove tasks.
- No MongoDB/MySQL/database is used.

## GitHub
Upload:
- index.html
- style.css
- script.js
- README.md

No `node_modules` or `.env` is required.

GitHub Pages can host this project because it is a static website.

## APK
After publishing the static website, it can be wrapped into an Android APK using a web-to-app/PWA wrapper or Capacitor. Because this app is frontend-only, no server backend is required.

## Important localStorage note
The APK/browser keeps its own localStorage. If the user uninstalls the app or clears its app data, locally saved tasks may be removed. Use Export Data to create a backup.


## Alarm / Reminder
Each task can have a time and an **Enable alarm/reminder** option.

### Web version
- The page checks scheduled tasks every 15 seconds.
- When a due task is reached, it can play an alarm sound and show a browser notification if notification permission is granted.
- Click **Test alarm** once to allow the browser to start audio and verify the sound.
- A web page cannot guarantee a real Android alarm after the browser/app is fully closed.

### For the final Android APK
For a reliable alarm that can fire even when the app is closed or the phone screen is off, wrap this frontend with **Capacitor** and add the native Android local-notifications/alarm capability. Keep this HTML/CSS/JS frontend; the native layer handles scheduled notifications.
