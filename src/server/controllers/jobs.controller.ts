import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import * as jobService from '../services/job.service.js';

const router = express.Router();

// Middleware: validate request
function validateRequest(req: Request, res: Response, next: NextFunction, schema: Joi.Schema) {
  const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  };
  const { error, value } = schema.validate(req.body, options);
  if (error) {
    res.status(400).json({ message: `Validation error: ${error.details.map((x) => x.message).join(', ')}` });
  } else {
    req.body = value;
    next();
  }
}

// routes
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', createSchema, create);
router.post('/bulk', bulkSchema, bulkImport);
router.post('/import', bulkSchema, bulkImport);
router.post('/deduplicate', deduplicate);
router.put('/:id', updateSchema, update);
router.delete('/:id', _delete);

export default router;

// ==========================================
// Route Functions
// ==========================================

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const jobs = await jobService.getAll(req.query as any);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await jobService.getById(parseInt(req.params.id, 10));
    res.json(job);
  } catch (err) {
    next(err);
  }
}

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (Array.isArray(req.body)) {
      const result = await jobService.bulkImport(req.body, { deduplicate: true });
      return res.json({
        message: `Successfully imported ${result.createdCount} unique jobs (${result.skippedDuplicates} duplicates skipped)`,
        ...result,
      });
    }

    const allowDuplicate = req.query.allowDuplicate === 'true' || req.body.allowDuplicate === true;
    const job = await jobService.create(req.body, allowDuplicate);
    res.json({ message: 'Job advert created', job });
  } catch (err) {
    next(err);
  }
}

async function bulkImport(req: Request, res: Response, next: NextFunction) {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body?.jobs;
    const deduplicateFlag = req.body?.deduplicate !== false && req.query.deduplicate !== 'false';
    const updateExisting = req.body?.updateExisting === true || req.query.updateExisting === 'true';

    const result = await jobService.bulkImport(list, { deduplicate: deduplicateFlag, updateExisting });

    let message = `Successfully imported ${result.createdCount} unique job${result.createdCount === 1 ? '' : 's'}`;
    if (result.skippedDuplicates > 0) {
      message += ` (${result.skippedDuplicates} duplicate${result.skippedDuplicates === 1 ? '' : 's'} skipped to keep listings unique)`;
    }
    if (result.updatedCount > 0) {
      message += ` and enriched ${result.updatedCount} existing job${result.updatedCount === 1 ? '' : 's'}`;
    }

    res.json({
      message,
      count: result.createdCount,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function deduplicate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await jobService.deduplicate();
    const message =
      result.removedCount > 0
        ? `Successfully cleaned up ${result.removedCount} duplicate listing${result.removedCount === 1 ? '' : 's'}. All ${result.remainingCount} remaining listings are now unique!`
        : `All ${result.remainingCount} job listings are already unique!`;

    res.json({
      message,
      removedCount: result.removedCount,
      remainingCount: result.remainingCount,
      removedJobs: (result as any).removedJobs || [],
    });
  } catch (err) {
    next(err);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await jobService.update(parseInt(req.params.id, 10), req.body);
    res.json({ message: 'Job advert updated', job });
  } catch (err) {
    next(err);
  }
}

async function _delete(req: Request, res: Response, next: NextFunction) {
  try {
    await jobService._delete(parseInt(req.params.id, 10));
    res.json({ message: 'Job advert deleted' });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Schema Validation Functions
// ==========================================

function createSchema(req: Request, res: Response, next: NextFunction) {
  if (Array.isArray(req.body)) {
    const itemSchema = Joi.object({
      jobTitle: Joi.string().empty(''),
      title: Joi.string().empty(''),
      company: Joi.string().required(),
      advertDate: Joi.string().empty(''),
      url: Joi.string().empty('').allow('#'),
      area: Joi.string().empty(''),
      location: Joi.string().empty(''),
      salary: Joi.string().empty('').allow(null),
      employmentType: Joi.string().empty('').allow(null),
      employment_type: Joi.string().empty('').allow(null),
      highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
      allowDuplicate: Joi.boolean(),
    }).or('jobTitle', 'title');

    return validateRequest(req, res, next, Joi.array().items(itemSchema).min(1).required());
  }

  const schema = Joi.object({
    jobTitle: Joi.string().empty(''),
    title: Joi.string().empty(''),
    company: Joi.string().required(),
    advertDate: Joi.string().empty(''),
    url: Joi.string().empty('').allow('#'),
    area: Joi.string().empty(''),
    location: Joi.string().empty(''),
    salary: Joi.string().empty('').allow(null),
    employmentType: Joi.string().empty('').allow(null),
    employment_type: Joi.string().empty('').allow(null),
    highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
    allowDuplicate: Joi.boolean(),
  }).or('jobTitle', 'title');

  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    jobTitle: Joi.string().empty(''),
    title: Joi.string().empty(''),
    company: Joi.string().empty(''),
    advertDate: Joi.string().empty(''),
    url: Joi.string().empty('').allow('#'),
    area: Joi.string().empty(''),
    location: Joi.string().empty(''),
    salary: Joi.string().empty('').allow(null),
    employmentType: Joi.string().empty('').allow(null),
    employment_type: Joi.string().empty('').allow(null),
    highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
    allowDuplicate: Joi.boolean(),
  });

  validateRequest(req, res, next, schema);
}

function bulkSchema(req: Request, res: Response, next: NextFunction) {
  const itemSchema = Joi.object({
    jobTitle: Joi.string().empty(''),
    title: Joi.string().empty(''),
    company: Joi.string().required(),
    advertDate: Joi.string().empty(''),
    url: Joi.string().empty('').allow('#'),
    area: Joi.string().empty(''),
    location: Joi.string().empty(''),
    salary: Joi.string().empty('').allow(null),
    employmentType: Joi.string().empty('').allow(null),
    employment_type: Joi.string().empty('').allow(null),
    highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null),
  }).or('jobTitle', 'title');

  let schema: Joi.Schema;
  if (Array.isArray(req.body)) {
    schema = Joi.array().items(itemSchema).min(1).required();
  } else {
    schema = Joi.object({
      jobs: Joi.array().items(itemSchema).min(1).required(),
      deduplicate: Joi.boolean().default(true),
      updateExisting: Joi.boolean().default(false),
    });
  }

  validateRequest(req, res, next, schema);
}
