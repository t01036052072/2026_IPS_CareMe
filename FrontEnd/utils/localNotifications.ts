import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'careme-reminders';

export const setupLocalNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'CareMe reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.granted;
};

export const scheduleOneTimeNotification = async (
  date: Date,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) => {
  const granted = await setupLocalNotifications();
  if (!granted) {
    console.log('[notifications] permission denied');
    return null;
  }

  if (date.getTime() <= Date.now()) {
    console.log('[notifications] skipped past notification:', date.toISOString());
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
};

export const scheduleMedicationNotifications = async ({
  name,
  startDate,
  time,
  durationDays,
  count,
}: {
  name: string;
  startDate: string;
  time: string;
  durationDays: number;
  count: number;
}) => {
  const ids: string[] = [];
  const [hour, minute] = time.split(':').map(Number);

  for (let offset = 0; offset < durationDays; offset += 1) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + offset);
    date.setHours(hour, minute, 0, 0);

    const id = await scheduleOneTimeNotification(
      date,
      '복약 알림',
      `${name} ${count}정 복용 시간입니다.`,
      { type: 'medication', name },
    );
    if (id) ids.push(id);
  }

  console.log('[notifications] scheduled medication notifications:', ids.length);
  return ids;
};

export const scheduleAppointmentNotification = async ({
  hospitalName,
  alarmDate,
  alarmTime,
  appointmentDate,
  appointmentTime,
}: {
  hospitalName: string;
  alarmDate: string;
  alarmTime: string;
  appointmentDate: string;
  appointmentTime: string;
}) => {
  const [hour, minute] = alarmTime.split(':').map(Number);
  const date = new Date(`${alarmDate}T00:00:00`);
  date.setHours(hour, minute, 0, 0);

  return scheduleOneTimeNotification(
    date,
    '병원 예약 알림',
    `${hospitalName} 예약이 ${appointmentDate} ${appointmentTime}에 있습니다.`,
    { type: 'appointment', hospitalName },
  );
};
