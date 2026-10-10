const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const jobService = require('../services/job.service');

// routes
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', createSchema, create);
router.post('/bulk', bulkSchema, bulkImport);
router.post('/import', bulkSchema, bulkImport);
router.post('/deduplicate', deduplicate);
router.put('/:id', updateSchema, update);
router.delete('/:id', _delete);

module.exports = router;

// ==========================================
// Route Functions
// ==========================================

/**
 * Retrieve all job adverts with optional search/filtering
 * Supported queries: ?search=keyword, ?company=name, ?area=city
 */
function getAll(req, res, next) {
    jobService.getAll(req.query)
        .then(jobs => res.json(jobs))
        .catch(next);
}

/**
 * Retrieve single job advert by ID
 */
function getById(req, res, next) {
    jobService.getById(req.params.id)
        .then(job => res.json(job))
        .catch(next);
}

/**
 * Create a new job advert (or batch if array is sent)
 */
function create(req, res, next) {
    // If client posted an array of jobs to POST /, route to bulk import
    if (Array.isArray(req.body)) {
        return jobService.bulkImport(req.body, { deduplicate: true })
            .then(result => res.json({
                message: `Successfully imported ${result.createdCount} unique jobs (${result.skippedDuplicates} duplicates skipped)`,
                ...result
            }))
            .catch(next);
    }

    const allowDuplicate = req.query.allowDuplicate === 'true' || req.body.allowDuplicate === true;
    jobService.create(req.body, allowDuplicate)
        .then(job => res.json({ message: 'Job advert created', job }))
        .catch(next);
}

/**
 * Bulk import multiple job adverts with deduplication & enrichment
 */
function bulkImport(req, res, next) {
    const list = Array.isArray(req.body) ? req.body : req.body.jobs;
    const deduplicateFlag = req.body?.deduplicate !== false && req.query.deduplicate !== 'false';
    const updateExisting = req.body?.updateExisting === true || req.query.updateExisting === 'true';

    jobService.bulkImport(list, { deduplicate: deduplicateFlag, updateExisting })
        .then(result => {
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
                ...result
            });
        })
        .catch(next);
}

/**
 * Scan database and purge duplicate listings, keeping the richest record
 */
function deduplicate(req, res, next) {
    jobService.deduplicate()
        .then(result => {
            const message = result.removedCount > 0
                ? `Successfully cleaned up ${result.removedCount} duplicate listing${result.removedCount === 1 ? '' : 's'}. All ${result.remainingCount} remaining listings are now unique!`
                : `All ${result.remainingCount} job listings are already unique!`;

            res.json({
                message,
                removedCount: result.removedCount,
                remainingCount: result.remainingCount,
                removedJobs: result.removedJobs
            });
        })
        .catch(next);
}

/**
 * Update an existing job advert by ID
 */
function update(req, res, next) {
    jobService.update(req.params.id, req.body)
        .then(job => res.json({ message: 'Job advert updated', job }))
        .catch(next);
}

/**
 * Delete a job advert by ID
 */
function _delete(req, res, next) {
    jobService.delete(req.params.id)
        .then(() => res.json({ message: 'Job advert deleted' }))
        .catch(next);
}

// ==========================================
// Schema Validation Functions
// ==========================================

function createSchema(req, res, next) {
    // If request body is an array, validate each item
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
            allowDuplicate: Joi.boolean()
        }).or('jobTitle', 'title');

        const arraySchema = Joi.array().items(itemSchema).min(1).required();
        return validateRequest(req, next, arraySchema);
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
        allowDuplicate: Joi.boolean()
    }).or('jobTitle', 'title');

    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
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
        allowDuplicate: Joi.boolean()
    });

    validateRequest(req, next, schema);
}

function bulkSchema(req, res, next) {
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
        highlights: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).allow(null)
    }).or('jobTitle', 'title');

    let schema;
    if (Array.isArray(req.body)) {
        schema = Joi.array().items(itemSchema).min(1).required();
    } else {
        schema = Joi.object({
            jobs: Joi.array().items(itemSchema).min(1).required(),
            deduplicate: Joi.boolean().default(true),
            updateExisting: Joi.boolean().default(false)
        });
    }

    validateRequest(req, next, schema);
}
