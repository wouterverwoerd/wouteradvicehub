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
    const advices = await store.getAllAdvices();
    res.json(advices);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const advice = await store.getAdviceById(id);
    if (!advice) {
      res.status(404).json({ message: 'Advice not found' });
      return;
    }
    res.json(advice);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    await store.createAdvice(req.body);
    res.json({ message: 'Advice created' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.updateAdvice(id, req.body);
    res.json({ message: 'Advice updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.deleteAdvice(id);
    res.json({ message: 'Advice deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

function createSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    content: Joi.string().required(),
    userid: Joi.string().required(),
    touserid: Joi.string().required(),
    filename: Joi.string().required(),
  });
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    content: Joi.string().allow('', null),
    touserid: Joi.string().allow('', null),
    filename: Joi.string().allow('', null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
