import { useEffect, useRef } from 'react';
import api from './api';
import { usePreferences } from './PreferencesContext';

export default function useWebNotifications() {
  const { preferences } = usePreferences();
  const notifiedReminders = useRef(new Set());

  useEffect(() => {
    if (!preferences.notificationsEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const checkReminders = async () => {
      try {
        const res = await api.get('/events');
        const goals = res.data.events.filter(g => g.status === 'active');
        const now = new Date();

        goals.forEach(goal => {
          if (!goal.reminders || !Array.isArray(goal.reminders)) return;
          
          const startTime = new Date(goal.start_time);
          
          goal.reminders.forEach(reminder => {
            // Calculate when this reminder should fire
            const remindTime = new Date(startTime.getTime() - reminder.minutes_before * 60000);
            const timeDiff = (remindTime.getTime() - now.getTime()) / 60000;
            
            // If the reminder is due within the last minute or next minute, and we haven't notified yet
            const reminderKey = `${goal.id}-${reminder.minutes_before}`;
            
            if (timeDiff <= 1 && timeDiff >= -5 && !notifiedReminders.current.has(reminderKey)) {
              notifiedReminders.current.add(reminderKey);
              
              const title = `Omniscient Scheduler: ${goal.title}`;
              const message = reminder.minutes_before === 0 
                ? `TASK OVERDUE: The deadline has passed!` 
                : `Upcoming: Starts at ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

              new Notification(title, {
                body: message,
                icon: '/bot-icon.png'
              });
            }
          });
        });
      } catch (err) {
        console.error("Failed to check web notifications", err);
      }
    };

    // Check immediately, then every 60 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 60000);

    return () => clearInterval(intervalId);
  }, [preferences.notificationsEnabled]);
}
