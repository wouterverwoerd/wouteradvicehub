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
    const ideas = await store.getAllIdeas();
    res.json(ideas);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const idea = await store.getIdeaById(id);
    if (!idea) {
      res.status(404).json({ message: 'Idea not found' });
      return;
    }
    res.json(idea);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    await store.createIdea(req.body);
    res.json({ message: 'Idea created' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.updateIdea(id, req.body);
    res.json({ message: 'Idea updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.deleteIdea(id);
    res.json({ message: 'Idea deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

function createSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    description: Joi.string().required(),
    ideaDate: Joi.string().required(),
    ideaFilename: Joi.string().required(),
  });
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    description: Joi.string().allow('', null),
    ideaDate: Joi.string().allow('', null),
    ideaFilename: Joi.string().allow('', null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
