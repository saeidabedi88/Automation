/**
 * Calendar Service - Manage events, ICS feeds, and upcoming reminders
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/calendar-service.log' })
  ]
});

const DATA_DIR = process.env.EMAIL_DATA_DIR || path.join(__dirname, '../../data');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CALENDAR_FILE)) {
    fs.writeFileSync(
      CALENDAR_FILE,
      JSON.stringify({ sources: [], events: [], reminderLog: [] }, null, 2)
    );
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(CALENDAR_FILE, 'utf8'));
  } catch (_) {
    return { sources: [], events: [], reminderLog: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(CALENDAR_FILE, JSON.stringify(store, null, 2));
}

/**
 * Minimal ICS parser for VEVENT blocks
 */
function parseIcs(icsText, sourceId) {
  const events = [];
  const blocks = icsText.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i += 1) {
    const block = blocks[i].split('END:VEVENT')[0];
    const get = (key) => {
      const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'mi'));
      return match ? match[1].trim() : null;
    };

    const uid = get('UID') || uuidv4();
    const summary = get('SUMMARY') || 'Untitled event';
    const description = get('DESCRIPTION') || '';
    const location = get('LOCATION') || '';
    const dtStart = get('DTSTART');
    const dtEnd = get('DTEND');

    if (!dtStart) continue;

    events.push({
      id: `${sourceId}:${uid}`,
      sourceId,
      uid,
      title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' '),
      description: description.replace(/\\,/g, ',').replace(/\\n/g, '\n'),
      location: location.replace(/\\,/g, ','),
      start: icsDateToIso(dtStart),
      end: dtEnd ? icsDateToIso(dtEnd) : null,
      allDay: /^\d{8}$/.test(dtStart),
      reminderMinutes: [60, 15],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return events;
}

function icsDateToIso(value) {
  // Formats: 20260110T150000Z or 20260110 or 20260110T150000
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return new Date(value).toISOString();
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? 'Z' : ''}`;
  return new Date(iso).toISOString();
}

function listSources() {
  return readStore().sources;
}

function listEvents({ from = null, to = null } = {}) {
  const store = readStore();
  let events = [...store.events];
  if (from) {
    const fromDate = new Date(from);
    events = events.filter((e) => new Date(e.start) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    events = events.filter((e) => new Date(e.start) <= toDate);
  }
  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

async function addSource({ label, url, provider = 'ics' }) {
  if (!url) throw new Error('Calendar ICS URL is required');

  const store = readStore();
  const source = {
    id: uuidv4(),
    label: label || 'Calendar',
    url,
    provider,
    enabled: true,
    createdAt: new Date().toISOString(),
    lastSyncedAt: null,
    lastError: null
  };

  // Validate by fetching once
  await syncSource(source, store);
  store.sources.push(source);
  writeStore(store);
  return source;
}

function removeSource(id) {
  const store = readStore();
  const before = store.sources.length;
  store.sources = store.sources.filter((s) => s.id !== id);
  store.events = store.events.filter((e) => e.sourceId !== id);
  if (store.sources.length === before) {
    throw new Error('Calendar source not found');
  }
  writeStore(store);
  return { deleted: true };
}

async function syncSource(source, existingStore = null) {
  const store = existingStore || readStore();
  try {
    const response = await axios.get(source.url, {
      timeout: 20000,
      headers: { 'User-Agent': 'EmailAutomationPlatform/1.0' }
    });
    const parsed = parseIcs(response.data, source.id);
    store.events = [
      ...store.events.filter((e) => e.sourceId !== source.id),
      ...parsed
    ];
    source.lastSyncedAt = new Date().toISOString();
    source.lastError = null;
    if (!existingStore) {
      const idx = store.sources.findIndex((s) => s.id === source.id);
      if (idx >= 0) store.sources[idx] = source;
      writeStore(store);
    }
    return { synced: parsed.length };
  } catch (error) {
    source.lastError = error.message;
    logger.error(`Calendar sync failed for ${source.label}: ${error.message}`);
    if (!existingStore) {
      const idx = store.sources.findIndex((s) => s.id === source.id);
      if (idx >= 0) store.sources[idx] = source;
      writeStore(store);
    }
    throw new Error(`Failed to sync calendar: ${error.message}`);
  }
}

async function syncAllSources() {
  const store = readStore();
  const results = [];
  for (const source of store.sources.filter((s) => s.enabled)) {
    try {
      const result = await syncSource(source, store);
      results.push({ sourceId: source.id, ...result });
    } catch (error) {
      results.push({ sourceId: source.id, error: error.message });
    }
  }
  writeStore(store);
  return results;
}

function createEvent(input) {
  if (!input.title || !input.start) {
    throw new Error('title and start are required');
  }

  const store = readStore();
  const event = {
    id: uuidv4(),
    sourceId: 'local',
    uid: uuidv4(),
    title: input.title,
    description: input.description || '',
    location: input.location || '',
    start: new Date(input.start).toISOString(),
    end: input.end ? new Date(input.end).toISOString() : null,
    allDay: Boolean(input.allDay),
    reminderMinutes: Array.isArray(input.reminderMinutes)
      ? input.reminderMinutes
      : [60, 15],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.events.push(event);
  writeStore(store);
  return event;
}

function updateEvent(id, updates) {
  const store = readStore();
  const index = store.events.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Event not found');

  store.events[index] = {
    ...store.events[index],
    ...updates,
    id,
    start: updates.start
      ? new Date(updates.start).toISOString()
      : store.events[index].start,
    end: updates.end
      ? new Date(updates.end).toISOString()
      : store.events[index].end,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  return store.events[index];
}

function deleteEvent(id) {
  const store = readStore();
  const before = store.events.length;
  store.events = store.events.filter((e) => e.id !== id);
  if (store.events.length === before) throw new Error('Event not found');
  writeStore(store);
  return { deleted: true };
}

/**
 * Return reminders that should fire now (within a lookback window)
 */
function getDueReminders({ lookAheadMinutes = 120, lookBackMinutes = 5 } = {}) {
  const store = readStore();
  const now = Date.now();
  const due = [];

  for (const event of store.events) {
    const startMs = new Date(event.start).getTime();
    if (Number.isNaN(startMs)) continue;

    const minutes = event.reminderMinutes || [60, 15];
    for (const mins of minutes) {
      const remindAt = startMs - mins * 60 * 1000;
      const key = `${event.id}:${mins}`;
      const already = store.reminderLog.find((r) => r.key === key);
      if (already) continue;

      const delta = remindAt - now;
      if (delta <= lookAheadMinutes * 60 * 1000 && delta >= -lookBackMinutes * 60 * 1000) {
        due.push({
          key,
          eventId: event.id,
          title: event.title,
          location: event.location,
          start: event.start,
          end: event.end,
          remindMinutesBefore: mins,
          message: mins <= 0
            ? `Starting now: ${event.title}`
            : `In ${mins} minutes: ${event.title}${event.location ? ` @ ${event.location}` : ''}`,
          dueAt: new Date(remindAt).toISOString()
        });
      }
    }
  }

  return due.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

function acknowledgeReminder(key) {
  const store = readStore();
  if (!store.reminderLog.find((r) => r.key === key)) {
    store.reminderLog.push({
      key,
      acknowledgedAt: new Date().toISOString()
    });
    // Keep log bounded
    if (store.reminderLog.length > 500) {
      store.reminderLog = store.reminderLog.slice(-500);
    }
    writeStore(store);
  }
  return { acknowledged: true };
}

function getUpcoming({ hours = 72 } = {}) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return listEvents({ from: now.toISOString(), to: until.toISOString() });
}

module.exports = {
  listSources,
  addSource,
  removeSource,
  syncAllSources,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getDueReminders,
  acknowledgeReminder,
  getUpcoming
};
