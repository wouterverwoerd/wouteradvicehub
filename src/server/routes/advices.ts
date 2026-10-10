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
    const dbAdvices = await store.getAllAdvices();
    const formattedDbAdvices = dbAdvices.map((advice) => ({
      ...advice,
      source: (advice.source || 'database') as 'database' | 'external',
      isExternal: advice.isExternal ?? false,
    }));

    let externalAdvices: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const extRes = await fetch('https://wouteradvicenode.onrender.com/advices', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (extRes.ok) {
        const raw = await extRes.json();
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.advices) ? raw.advices : [];
        externalAdvices = items
          .map((item: any, idx: number) => {
            if (!item || typeof item !== 'object') return null;
            return {
              id: item.id ? (typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || 500 + idx) : 500 + idx,
              content: item.content || item.description || '',
              userid: String(item.userid ?? '1'),
              touserid: String(item.touserid ?? '2'),
              filename: item.filename || 'NoFile',
              source: 'external' as const,
              isExternal: true,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          })
          .filter(Boolean);
      }
    } catch (extErr: any) {
      console.warn('[External Advices Fetch Notice]', extErr.message || extErr);
    }

    if (externalAdvices.length === 0) {
      return res.json(formattedDbAdvices);
    }

    // Merge external advices with database advices, deduplicating
    const combined: any[] = [...formattedDbAdvices];
    for (const ext of externalAdvices) {
      const isDup = combined.some(
        (existing) =>
          existing.id === ext.id ||
          (existing.content &&
            ext.content &&
            existing.content.trim().toLowerCase() === ext.content.trim().toLowerCase())
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
    const advice = await store.getAdviceById(id);
    if (advice) {
      return res.json(advice);
    }

    // Try fetching from remote if not found in local DB
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const extRes = await fetch(`https://wouteradvicenode.onrender.com/advices/${id}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (extRes.ok) {
        const extAdvice = await extRes.json();
        return res.json({
          ...extAdvice,
          source: 'external',
          isExternal: true,
        });
      }
    } catch {
      // ignore
    }

      res.status(404).json({ message: 'Advice not found' });
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    // Preference given to remote API at https://wouteradvicenode.onrender.com
    let remoteAdvice: any = null;
    let remoteSynced = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const remotePayload = {
        content: req.body.content,
        userid: String(req.body.userid || '1'),
        touserid: String(req.body.touserid || '2'),
        filename: req.body.filename || 'NoFile',
      };

      const remoteRes = await fetch('https://wouteradvicenode.onrender.com/advices', {
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
        remoteAdvice = remoteData.advice || remoteData;
        remoteSynced = true;
      } else {
        const errText = await remoteRes.text().catch(() => '');
        console.warn('[Remote Advice Create Warning]', remoteRes.status, errText);
      }
    } catch (remoteErr: any) {
      console.warn('[Remote Advice Create Error (falling back to local)]', remoteErr.message || remoteErr);
    }

    // Store locally as well for offline resilience, persistence & fast retrieval
    let created: any = null;
    try {
      created = await store.createAdvice({
        ...req.body,
        userid: String(req.body.userid || '1'),
        touserid: String(req.body.touserid || '2'),
        filename: req.body.filename || 'NoFile',
        ...(remoteAdvice?.id ? { id: remoteAdvice.id } : {}),
      });
    } catch (localErr: any) {
      console.warn('[Local Advice store note]', localErr.message);
    }

    res.json({
      message: remoteSynced
        ? 'Advice created successfully on wouteradvicenode.onrender.com (and synced locally)'
        : 'Advice created in local database',
      advice: {
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
      await fetch(`https://wouteradvicenode.onrender.com/advices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.updateAdvice(id, req.body).catch(() => {});
    res.json({ message: 'Advice updated' });
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
      await fetch(`https://wouteradvicenode.onrender.com/advices/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.deleteAdvice(id).catch(() => {});
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
