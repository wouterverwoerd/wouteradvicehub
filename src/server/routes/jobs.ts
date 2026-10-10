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
    const jobs = await store.getAllJobs();
    res.json(jobs);
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

    res.json({
      message,
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

    const created = await store.createJob(req.body);
    res.json({ message: 'Job advert created', job: created });
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
