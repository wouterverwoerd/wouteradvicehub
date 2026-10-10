import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { store, isJobDuplicate } from '../store.js';

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
    const dbJobs = await store.getAllJobs();
    const formattedDbJobs = dbJobs.map((job) => ({
      ...job,
      source: (job.source || 'database') as 'database' | 'external',
      isExternal: job.isExternal ?? false,
    }));

    let externalJobs: any[] = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for cold start

      const extRes = await fetch('https://wouteradvicenode.onrender.com/jobs', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (extRes.ok) {
        const raw = await extRes.json();
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.jobs) ? raw.jobs : [];
        
        externalJobs = items
          .map((item: any, idx: number) => {
            if (!item || typeof item !== 'object') return null;
            return {
              id: item.id ? (typeof item.id === 'number' ? item.id : parseInt(item.id, 10) || 2000 + idx) : 2000 + idx,
              jobTitle: item.jobTitle || item.title || 'Untitled Role',
              advertDate: item.advertDate || item.date || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              company: item.company || 'Unknown Company',
              url: item.url || '#',
              area: item.area || item.location || 'New Zealand',
              salary: item.salary || null,
              employmentType: item.employmentType || item.employment_type || null,
              employment_type: item.employmentType || item.employment_type || null,
              highlights: Array.isArray(item.highlights) ? item.highlights : null,
              source: 'external' as const,
              isExternal: true,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          })
          .filter(Boolean);
      }
    } catch (extErr: any) {
      console.warn('[External Jobs Fetch Notice from wouteradvicenode]', extErr.message || extErr);
    }

    if (externalJobs.length === 0) {
      // When remote endpoint returns empty [] or is unreachable, serve database/seeded jobs
      return res.json(formattedDbJobs);
    }

    // Merge external jobs with database jobs, filtering out duplicates
    const combined: any[] = [...formattedDbJobs];
    for (const extJob of externalJobs) {
      const isDup = combined.some((existing) => isJobDuplicate(extJob, existing));
      if (!isDup) {
        combined.push(extJob);
      }
    }

    res.json(combined);
  } catch (err) {
    next(err);
  }
});

router.post('/deduplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await store.deduplicateExistingJobs();
    const message =
      result.removedCount > 0
        ? `Successfully cleaned up ${result.removedCount} duplicate listing${result.removedCount === 1 ? '' : 's'}. All ${result.remainingCount} remaining listings are now unique!`
        : `All ${result.remainingCount} job listings are already unique!`;
    res.json({
      message,
      removedCount: result.removedCount,
      remainingCount: result.remainingCount,
      removedJobs: result.removedJobs,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body?.jobs;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: 'Expected a JSON array of job objects' });
    }
    const deduplicate = req.body?.deduplicate !== false && req.query.deduplicate !== 'false';
    const updateExisting = req.body?.updateExisting === true || req.query.updateExisting === 'true';

    const result = await store.createJobsBulk(list, { deduplicate, updateExisting });

    let message = `Successfully imported ${result.created.length} unique job${result.created.length === 1 ? '' : 's'}`;
    if (result.skippedDuplicates > 0) {
      message += ` (${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? '' : 's'} skipped to keep listings unique)`;
    }
    if (result.updated.length > 0) {
      message += ` and enriched ${result.updated.length} existing job${result.updated.length === 1 ? '' : 's'}`;
    }

    // Synchronize unique imported jobs with wouteradvicenode.onrender.com
    let remoteSyncCount = 0;
    if (result.created.length > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const remoteRes = await fetch('https://wouteradvicenode.onrender.com/jobs/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            jobs: result.created.map((j) => ({
              jobTitle: j.jobTitle,
              company: j.company,
              advertDate: j.advertDate,
              url: j.url || '#',
              area: j.area || 'New Zealand',
              salary: j.salary || null,
              employmentType: j.employmentType || null,
              highlights: j.highlights || [],
            })),
            deduplicate: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (remoteRes.ok) {
          const remoteJson = await remoteRes.json();
          remoteSyncCount = remoteJson.createdCount ?? remoteJson.count ?? result.created.length;
        }
      } catch (remoteImportErr: any) {
        console.warn('[Remote Import Sync Notice (local database preserved)]', remoteImportErr.message || remoteImportErr);
      }
    }

    if (remoteSyncCount > 0) {
      message += ` (synced ${remoteSyncCount} to wouteradvicenode.onrender.com)`;
    }

    res.json({
      message,
      count: result.created.length,
      createdCount: result.created.length,
      skippedDuplicates: result.skippedDuplicates,
      updatedCount: result.updated.length,
      totalProcessed: result.totalProcessed,
      duplicateTitles: result.duplicateTitles,
      remoteSyncCount,
      targetServer: 'https://wouteradvicenode.onrender.com',
      jobs: result.created,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body?.jobs;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: 'Expected a JSON array of job objects' });
    }
    const deduplicate = req.body?.deduplicate !== false && req.query.deduplicate !== 'false';
    const updateExisting = req.body?.updateExisting === true || req.query.updateExisting === 'true';

    const result = await store.createJobsBulk(list, { deduplicate, updateExisting });

    res.json({
      message: `Successfully imported ${result.created.length} unique jobs (${result.skippedDuplicates} duplicates skipped)`,
      count: result.created.length,
      createdCount: result.created.length,
      skippedDuplicates: result.skippedDuplicates,
      updatedCount: result.updated.length,
      totalProcessed: result.totalProcessed,
      duplicateTitles: result.duplicateTitles,
      jobs: result.created,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
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

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If an array is passed to POST /jobs, treat as bulk import with deduplication
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) {
        return res.status(400).json({ message: 'Array of jobs cannot be empty' });
      }
      const result = await store.createJobsBulk(req.body, { deduplicate: true });
      return res.json({
        message: `Successfully imported ${result.created.length} unique jobs (${result.skippedDuplicates} duplicates skipped)`,
        count: result.created.length,
        createdCount: result.created.length,
        skippedDuplicates: result.skippedDuplicates,
        jobs: result.created,
      });
    }

    createSchema(req, res, async () => {
      try {
        const allJobs = await store.getAllJobs();
        const isDup = allJobs.some((j) => isJobDuplicate(req.body, j));
        if (isDup && req.query.allowDuplicate !== 'true' && req.body.allowDuplicate !== true) {
          return res.status(409).json({
            message: `A job listing for "${req.body.jobTitle || req.body.title}" at "${req.body.company}" already exists. Listings are kept unique.`,
            isDuplicate: true,
          });
        }

        // Preference given to remote API at https://wouteradvicenode.onrender.com
        let remoteJob: any = null;
        let remoteSynced = false;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const remotePayload = {
            jobTitle: req.body.jobTitle || req.body.title,
            company: req.body.company,
            advertDate: req.body.advertDate,
            url: req.body.url || '#',
            area: req.body.area || req.body.location || 'New Zealand',
            salary: req.body.salary || null,
            employmentType: req.body.employmentType || req.body.employment_type || null,
            highlights: Array.isArray(req.body.highlights) ? req.body.highlights : [],
          };

          const remoteRes = await fetch('https://wouteradvicenode.onrender.com/jobs', {
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
            const remoteData = await remoteRes.json();
            remoteJob = remoteData.job || remoteData;
            remoteSynced = true;
          } else {
            const errText = await remoteRes.text().catch(() => '');
            console.warn('[Remote Job Create Warning]', remoteRes.status, errText);
          }
        } catch (remoteErr: any) {
          console.warn('[Remote Job Create Error (falling back to local)]', remoteErr.message || remoteErr);
        }

        // Store locally as well for offline resilience, persistence & fast retrieval
        const localPayload = {
          ...req.body,
          ...(remoteJob?.id ? { id: remoteJob.id } : {}),
          source: remoteSynced ? 'external' : 'database',
          isExternal: remoteSynced,
        };
        const created = await store.createJob(localPayload);

        res.json({
          message: remoteSynced
            ? 'Job advert created successfully on wouteradvicenode.onrender.com (and synced locally)'
            : 'Job advert created in local database',
          job: {
            ...created,
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
    jobTitle: Joi.string().allow('', null),
    title: Joi.string().allow('', null),
    advertDate: Joi.string().allow('', null),
    company: Joi.string().required(),
    url: Joi.string().allow('', null),
    area: Joi.string().allow('', null),
    location: Joi.string().allow('', null),
    salary: Joi.string().allow('', null),
    employment_type: Joi.string().allow('', null),
    employmentType: Joi.string().allow('', null),
    highlights: Joi.array().items(Joi.string()).allow(null),
  }).or('jobTitle', 'title');
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    jobTitle: Joi.string().allow('', null),
    title: Joi.string().allow('', null),
    advertDate: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    url: Joi.string().allow('', null),
    area: Joi.string().allow('', null),
    location: Joi.string().allow('', null),
    salary: Joi.string().allow('', null),
    employment_type: Joi.string().allow('', null),
    employmentType: Joi.string().allow('', null),
    highlights: Joi.array().items(Joi.string()).allow(null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
