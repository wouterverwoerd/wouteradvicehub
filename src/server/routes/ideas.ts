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

    if (externalIdeas.length === 0) {
      return res.json(formattedDbIdeas);
    }

    // Merge external ideas with database ideas, deduplicating by content match (never drop external items on ID collision with local DB)
    const combined: any[] = [...formattedDbIdeas];
    for (const ext of externalIdeas) {
      const isDup = combined.some(
        (existing) =>
          (existing.source === ext.source && existing.id === ext.id) ||
          (existing.description &&
            ext.description &&
            existing.description.trim().toLowerCase() === ext.description.trim().toLowerCase())
      );
      if (!isDup) {
        combined.push(ext);
      }
    }

    res.json(combined);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const idea = await store.getIdeaById(id);
    if (idea) {
      return res.json(idea);
    }

    // Try fetching from remote if not in local store
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const extRes = await fetch(`https://wouteradvicenode.onrender.com/ideas/${id}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (extRes.ok) {
        const extIdea = await extRes.json();
        return res.json({
          ...extIdea,
          source: 'external',
          isExternal: true,
        });
      }
    } catch {
      // ignore
    }

    res.status(404).json({ message: 'Idea not found' });
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    // Preference given to remote API at https://wouteradvicenode.onrender.com
    let remoteIdea: any = null;
    let remoteSynced = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const remotePayload = {
        description: req.body.description,
        ideaDate: req.body.ideaDate || new Date().toISOString().split('T')[0],
        ideaFilename: req.body.ideaFilename || 'idea_proposal.pdf',
      };

      const remoteRes = await fetch('https://wouteradvicenode.onrender.com/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(remotePayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (remoteRes.ok) {
        const remoteData = await remoteRes.json().catch(() => ({}));
        remoteIdea = remoteData.idea || remoteData;
        remoteSynced = true;
      } else {
        const errText = await remoteRes.text().catch(() => '');
        console.warn('[Remote Idea Create Warning]', remoteRes.status, errText);
      }
    } catch (remoteErr: any) {
      console.warn('[Remote Idea Create Error (falling back to local)]', remoteErr.message || remoteErr);
    }

    // Store locally as well for offline resilience, persistence & fast retrieval
    let created: any = null;
    try {
      created = await store.createIdea({
        ...req.body,
        ...(remoteIdea?.id ? { id: remoteIdea.id } : {}),
      });
    } catch (localErr: any) {
      console.warn('[Local Idea store note]', localErr.message);
    }

    res.json({
      message: remoteSynced
        ? 'Idea created successfully on wouteradvicenode.onrender.com (and synced locally)'
        : 'Idea created in local database',
      idea: {
        ...(created || req.body),
        source: remoteSynced ? 'external' : 'database',
        isExternal: remoteSynced,
      },
      remoteSynced,
      targetServer: 'https://wouteradvicenode.onrender.com',
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Attempt remote update
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch(`https://wouteradvicenode.onrender.com/ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.updateIdea(id, req.body).catch(() => {});
    res.json({ message: 'Idea updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Attempt remote delete
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch(`https://wouteradvicenode.onrender.com/ideas/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.deleteIdea(id).catch(() => {});
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
