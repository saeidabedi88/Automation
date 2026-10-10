const fs = require('fs');
const path = require('path');
const os = require('os');

describe('calendarService', () => {
  let tmpDir;
  let calendarService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-'));
    process.env.EMAIL_DATA_DIR = tmpDir;
    jest.resetModules();
    calendarService = require('../calendarService');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates local event and returns upcoming reminders', () => {
    const start = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const event = calendarService.createEvent({
      title: 'Standup',
      start,
      reminderMinutes: [60, 30]
    });

    expect(event.title).toBe('Standup');

    const upcoming = calendarService.getUpcoming({ hours: 2 });
    expect(upcoming.some((e) => e.id === event.id)).toBe(true);

    const reminders = calendarService.getDueReminders({ lookAheadMinutes: 120 });
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].title).toBe('Standup');
  });
});
