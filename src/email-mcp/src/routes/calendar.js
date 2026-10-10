/**
 * Routes for calendar sources, events, and reminders
 */
const express = require('express');
const Joi = require('joi');
const calendarService = require('../services/calendarService');

const router = express.Router();

const sourceSchema = Joi.object({
  label: Joi.string().allow('', null),
  url: Joi.string().uri().required(),
  provider: Joi.string().valid('ics', 'google', 'outlook', 'other').default('ics')
});

const eventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  location: Joi.string().allow('', null),
  start: Joi.date().iso().required(),
  end: Joi.date().iso().allow(null),
  allDay: Joi.boolean(),
  reminderMinutes: Joi.array().items(Joi.number().integer().min(0))
});

router.get('/sources', (req, res) => {
  res.json({ status: 'success', data: calendarService.listSources() });
});

router.post('/sources', async (req, res) => {
  try {
    const { error, value } = sourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    const source = await calendarService.addSource(value);
    res.status(201).json({ status: 'success', data: source });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

router.delete('/sources/:id', (req, res) => {
  try {
    res.json({ status: 'success', data: calendarService.removeSource(req.params.id) });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const results = await calendarService.syncAllSources();
    res.json({ status: 'success', data: results });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/events', (req, res) => {
  const events = calendarService.listEvents({
    from: req.query.from || null,
    to: req.query.to || null
  });
  res.json({ status: 'success', data: events });
});

router.get('/upcoming', (req, res) => {
  const hours = parseInt(req.query.hours || '72', 10);
  res.json({ status: 'success', data: calendarService.getUpcoming({ hours }) });
});

router.post('/events', (req, res) => {
  try {
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    const event = calendarService.createEvent(value);
    res.status(201).json({ status: 'success', data: event });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

router.patch('/events/:id', (req, res) => {
  try {
    const event = calendarService.updateEvent(req.params.id, req.body);
    res.json({ status: 'success', data: event });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

router.delete('/events/:id', (req, res) => {
  try {
    res.json({ status: 'success', data: calendarService.deleteEvent(req.params.id) });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

router.get('/reminders', (req, res) => {
  const lookAheadMinutes = parseInt(req.query.lookAheadMinutes || '120', 10);
  res.json({
    status: 'success',
    data: calendarService.getDueReminders({ lookAheadMinutes })
  });
});

router.post('/reminders/:key/ack', (req, res) => {
  try {
    res.json({
      status: 'success',
      data: calendarService.acknowledgeReminder(req.params.key)
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
