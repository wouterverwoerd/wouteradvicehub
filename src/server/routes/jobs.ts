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
    const jobs = await store.getAllJobs();
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const job = await store.getJobById(id);
    if (!job) {
      res.status(404).json({ message: 'Job advert not found' });
      return;
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await store.createJob(req.body);
    res.json({ message: 'Job advert created', job: created });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await store.updateJob(id, req.body);
    res.json({ message: 'Job advert updated', job: updated });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.deleteJob(id);
    res.json({ message: 'Job advert deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

function createSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    jobTitle: Joi.string().required(),
    advertDate: Joi.string().required(),
    company: Joi.string().required(),
    url: Joi.string().uri({ allowRelative: false }).required(),
  });
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    jobTitle: Joi.string().allow('', null),
    advertDate: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    url: Joi.string().uri({ allowRelative: false }).allow('', null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
