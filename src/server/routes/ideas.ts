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
    const dbIdeas = await store.getAllIdeas();
    const formattedDbIdeas = dbIdeas.map((idea) => ({
      ...idea,
      source: 'database' as const,
      isExternal: false,
    }));

    let externalIdeas: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for cold start

      const extRes = await fetch('https://wouteradvicenode.onrender.com/ideas', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (extRes.ok) {
        const raw = await extRes.json();
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.ideas) ? raw.ideas : [];
        externalIdeas = items.map((item: any, idx: number) => ({
          id: item.id ? (typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || 1000 + idx) : 1000 + idx,
          description: item.description || item.content || item.title || 'External Idea Proposal',
          ideaDate: item.ideaDate || item.date || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          ideaFilename: item.ideaFilename || item.filename || item.attachment || 'external_proposal.pdf',
          source: 'external' as const,
          isExternal: true,
        }));
      }
    } catch (extErr: any) {
      console.warn('[External Ideas Fetch Notice]', extErr.message || extErr);
    }

    res.json([...formattedDbIdeas, ...externalIdeas]);
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
