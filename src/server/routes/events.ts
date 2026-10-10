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
    const dbEvents = await store.getAllEvents();
    const formattedDbEvents = dbEvents.map((evt) => ({
      ...evt,
      source: (evt.source || 'database') as 'database' | 'external',
      isExternal: evt.isExternal ?? false,
    }));

    let externalEvents: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const extRes = await fetch('https://wouteradvicenode.onrender.com/events', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (extRes.ok) {
        const raw = await extRes.json();
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.events) ? raw.events : [];
        externalEvents = items
          .map((item: any, idx: number) => {
            if (!item || typeof item !== 'object') return null;
            return {
              id: item.id ? (typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || 500 + idx) : 500 + idx,
              description: item.description || '',
              userid: item.userid,
              adviceid: item.adviceid,
              eventDate: item.eventDate || item.date || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              eventFilename: item.eventFilename || item.filename || '-',
              source: 'external' as const,
              isExternal: true,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          })
          .filter(Boolean);
      }
    } catch (extErr: any) {
      console.warn('[External Events Fetch Notice]', extErr.message || extErr);
    }

    if (externalEvents.length === 0) {
      return res.json(formattedDbEvents);
    }

    // Merge external events with database events, deduplicating
    const combined: any[] = [...formattedDbEvents];
    for (const ext of externalEvents) {
      const isDup = combined.some(
        (existing) =>
          existing.id === ext.id ||
          (existing.description &&
            ext.description &&
            existing.description.trim().toLowerCase() === ext.description.trim().toLowerCase() &&
            String(existing.adviceid) === String(ext.adviceid))
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

// combined routes matching the wouteradvicenode API endpoints
const sendCombined = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const combined = await store.getCombinedEvents();

    // Fetch remote events to merge into combined groups if any
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const extRes = await fetch('https://wouteradvicenode.onrender.com/events', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (extRes.ok) {
        const raw = await extRes.json();
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.events) ? raw.events : [];
        for (const item of items) {
          if (!item || !item.adviceid) continue;
          const adviceGroup = combined.find((c) => String(c.adviceID) === String(item.adviceid));
          const extEventDetail = {
            eventID: item.id,
            eventDescription: item.description,
            eventDate: item.eventDate || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            eventFilename: item.eventFilename || '-',
            userid: item.userid,
          };

          if (adviceGroup) {
            const exists = adviceGroup.Events.some((e) => e.eventID === item.id || e.eventDescription === item.description);
            if (!exists) {
              adviceGroup.Events.push(extEventDetail);
            }
          } else {
            combined.push({
              adviceID: Number(item.adviceid) || 999,
              adviceDescription: `Advice #${item.adviceid}`,
              adviceFilename: '-',
              userid: String(item.userid || '4'),
              touserid: '4',
              Events: [extEventDetail],
            });
          }
        }
      }
    } catch (extErr: any) {
      console.warn('[External Combined Events Notice]', extErr.message || extErr);
    }

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
    if (event) {
      return res.json(event);
    }

    // Try fetching from remote if not in local store
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const extRes = await fetch(`https://wouteradvicenode.onrender.com/events/${id}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (extRes.ok) {
        const extEvent = await extRes.json();
        return res.json({
          ...extEvent,
          source: 'external',
          isExternal: true,
        });
      }
    } catch {
      // ignore
    }

      res.status(404).json({ message: 'Event not found' });
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response) => {
  try {
    // Preference given to remote API at https://wouteradvicenode.onrender.com
    let remoteEvent: any = null;
    let remoteSynced = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      // Note: wouteradvicenode validates that userid and adviceid are strings
      const remotePayload = {
        description: req.body.description,
        userid: String(req.body.userid || '4'),
        adviceid: String(req.body.adviceid || '4'),
        eventDate: req.body.eventDate || new Date().toISOString().split('T')[0],
        eventFilename: req.body.eventFilename || '-',
      };

      const remoteRes = await fetch('https://wouteradvicenode.onrender.com/events', {
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
        remoteEvent = remoteData.event || remoteData;
        remoteSynced = true;
      } else {
        const errText = await remoteRes.text().catch(() => '');
        console.warn('[Remote Event Create Warning]', remoteRes.status, errText);
      }
    } catch (remoteErr: any) {
      console.warn('[Remote Event Create Error (falling back to local)]', remoteErr.message || remoteErr);
    }

    // Store locally as well for offline resilience, persistence & fast retrieval
    let created: any = null;
    try {
      created = await store.createEvent({
        ...req.body,
        ...(remoteEvent?.id ? { id: remoteEvent.id } : {}),
      });
    } catch (localErr: any) {
      console.warn('[Local Event store note]', localErr.message);
    }

    res.json({
      message: remoteSynced
        ? 'Event created successfully on wouteradvicenode.onrender.com (and synced locally)'
        : 'Event created in local database',
      event: {
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
      const updatePayload = {
        ...req.body,
        ...(req.body.userid !== undefined ? { userid: String(req.body.userid) } : {}),
        ...(req.body.adviceid !== undefined ? { adviceid: String(req.body.adviceid) } : {}),
      };
      await fetch(`https://wouteradvicenode.onrender.com/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.updateEvent(id, req.body).catch(() => {});
    res.json({ message: 'Event updated' });
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
      await fetch(`https://wouteradvicenode.onrender.com/events/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // Fall through to local
    }

    await store.deleteEvent(id).catch(() => {});
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
