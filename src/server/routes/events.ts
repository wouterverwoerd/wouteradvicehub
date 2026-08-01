import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { store } from '../store.js';

const router = express.Router();

function validateRequest(req: Request, res: Response, next: NextFunction, schema: Joi.ObjectSchema) {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: `Validation error: ${error.details.map((x) => x.message).join(', ')}` });
  } else {
    req.body = value;
    next();
  }
}

// routes
router.get('/', async (req, res, next) => {
  try {
    const events = await store.getAllEvents();
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// combined routes matching the wouteradvicenode API endpoints
const sendCombined = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const combined = await store.getCombinedEvents();
    res.json(combined);
  } catch (err) {
    next(err);
  }
};

router.get('/combined', sendCombined);
router.get('/combined2', sendCombined);
router.get('/combined3', sendCombined);
router.get('/combined4', sendCombined);

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const event = await store.getEventById(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    await store.createEvent(req.body);
    res.json({ message: 'Event created' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.updateEvent(id, req.body);
    res.json({ message: 'Event updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.deleteEvent(id);
    res.json({ message: 'Event deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

function createSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    description: Joi.string().required(),
    userid: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    adviceid: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    eventDate: Joi.string().required(),
    eventFilename: Joi.string().required(),
  });
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    description: Joi.string().allow('', null),
    userid: Joi.alternatives().try(Joi.number(), Joi.string()).allow('', null),
    adviceid: Joi.alternatives().try(Joi.number(), Joi.string()).allow('', null),
    eventDate: Joi.string().allow('', null),
    eventFilename: Joi.string().allow('', null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
