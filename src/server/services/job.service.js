let db;
try {
    db = require('_helpers/db');
} catch (e1) {
    try {
        db = require('../_helpers/db');
    } catch (e2) {
        try {
            db = require('../db/sequelize');
        } catch (e3) {
            db = {};
        }
    }
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    bulkImport,
    deduplicate,
    isDuplicate,
    normalizeJobUrl
};

/**
 * Robustly resolve the Job Sequelize model.
 * Supports both db.Job (standard Jason Watmore / wouteradvicenode convention) and db.JobModel.
 */
function getJobModel() {
    const model = db.Job || db.JobModel;
    if (!model) {
        throw new Error(
            'Job model is undefined on db. Please verify that "db.Job = require(\'../jobs/job.model\')(sequelize);" has been added to your _helpers/db.js (or db/sequelize.js).'
        );
    }
    return model;
}

/**
 * Normalizes job advert URLs for robust duplicate checking
 * Strips tracking query parameters, hashes, and trailing slashes
 */
function normalizeJobUrl(url) {
    if (!url) return '';
    const trimmed = url.trim().toLowerCase().replace(/\/$/, '');
    if (trimmed === '#' || trimmed === 'https://' || trimmed === 'http://') return '';
    try {
        const u = new URL(trimmed);
        u.hash = '';
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach(p => {
            u.searchParams.delete(p);
        });
        return u.toString().replace(/\/$/, '');
    } catch {
        return trimmed;
    }
}

/**
 * Intelligent duplicate checker comparing URL, title, company, and regional area
 */
function isDuplicate(a, b) {
    if (!a || !b) return false;

    // 1. Direct URL match
    const urlA = normalizeJobUrl(a.url);
    const urlB = normalizeJobUrl(b.url);
    if (urlA && urlB && urlA === urlB) {
        return true;
    }

    // 2. Title & Company match
    const titleA = (a.jobTitle || a.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const titleB = (b.jobTitle || b.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const compA = (a.company || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const compB = (b.company || '').trim().toLowerCase().replace(/\s+/g, ' ');

    if (titleA && titleB && compA && compB && titleA === titleB && compA === compB) {
        const areaA = (a.area || a.location || '').trim().toLowerCase();
        const areaB = (b.area || b.location || '').trim().toLowerCase();

        // If either is generic / remote, or areas overlap
        if (!areaA || !areaB || areaA.includes('remote') || areaB.includes('remote') || areaA === areaB || areaA.includes(areaB) || areaB.includes(areaA)) {
            return true;
        }

        const cities = ['christchurch', 'auckland', 'wellington', 'hamilton', 'tauranga', 'dunedin', 'canterbury'];
        const cityA = cities.find(c => areaA.includes(c));
        const cityB = cities.find(c => areaB.includes(c));
        if (cityA && cityB && cityA === cityB) return true;
        if (cityA && cityB && cityA !== cityB) return false;

        return true;
    }

    return false;
}

/**
 * Retrieve all jobs with optional filters
 * @param {Object} [filter] - Optional filter object { search, area, company }
 */
async function getAll(filter = {}) {
    const Job = getJobModel();
    const where = {};
    const { Op } = require('sequelize');

    if (filter.company) {
        where.company = { [Op.like]: `%${filter.company}%` };
    }
    if (filter.area) {
        where.area = { [Op.like]: `%${filter.area}%` };
    }
    if (filter.search) {
        where[Op.or] = [
            { jobTitle: { [Op.like]: `%${filter.search}%` } },
            { company: { [Op.like]: `%${filter.search}%` } },
            { area: { [Op.like]: `%${filter.search}%` } }
        ];
    }

    return await Job.findAll({
        where: Object.keys(where).length > 0 ? where : undefined,
        order: [['createdAt', 'DESC']]
    });
}

/**
 * Retrieve a single job advert by ID
 */
async function getById(id) {
    return await getJob(id);
}

/**
 * Create a new job advert with uniqueness validation
 * @param {Object} params - Job parameters
 * @param {boolean} [allowDuplicate=false] - Whether to bypass duplicate validation
 */
async function create(params, allowDuplicate = false) {
    const Job = getJobModel();
    const jobTitle = params.jobTitle || params.title;
    const company = params.company;

    if (!jobTitle) throw new Error('Job title is required');
    if (!company) throw new Error('Company is required');

    // Duplicate check against existing database jobs
    if (!allowDuplicate) {
        const existingJobs = await Job.findAll();
        const duplicate = existingJobs.find(j => isDuplicate(params, j));
        if (duplicate) {
            throw new Error(`A job listing for "${jobTitle}" at "${company}" already exists.`);
        }
    }

    const payload = {
        jobTitle,
        company,
        advertDate: params.advertDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        url: params.url || '#',
        area: (params.area || params.location || 'Remote / Global').trim(),
        salary: params.salary || null,
        employmentType: params.employmentType || params.employment_type || null,
        highlights: Array.isArray(params.highlights) ? params.highlights : (params.highlights ? [params.highlights] : [])
    };

    const job = await Job.create(payload);
    return job;
}

/**
 * Update an existing job advert
 */
async function update(id, params) {
    const Job = getJobModel();
    const job = await getJob(id);

    // If title or company changed, check for conflict with other listings
    const newTitle = params.jobTitle || params.title || job.jobTitle;
    const newCompany = params.company || job.company;
    const titleOrCompanyChanged = (newTitle !== job.jobTitle) || (newCompany !== job.company);

    if (titleOrCompanyChanged) {
        const { Op } = require('sequelize');
        const otherJobs = await Job.findAll({
            where: {
                id: { [Op.ne]: id }
            }
        });
        const conflict = otherJobs.find(j => isDuplicate({ jobTitle: newTitle, company: newCompany, url: params.url || job.url, area: params.area || job.area }, j));
        if (conflict) {
            throw new Error(`Cannot update: A job listing for "${newTitle}" at "${newCompany}" already exists.`);
        }
    }

    const updateData = {};
    if (params.jobTitle || params.title) updateData.jobTitle = newTitle;
    if (params.company) updateData.company = newCompany;
    if (params.advertDate) updateData.advertDate = params.advertDate;
    if (params.url !== undefined) updateData.url = params.url;
    if (params.area !== undefined || params.location !== undefined) updateData.area = (params.area || params.location || '').trim();
    if (params.salary !== undefined) updateData.salary = params.salary;
    if (params.employmentType !== undefined || params.employment_type !== undefined) {
        updateData.employmentType = params.employmentType || params.employment_type;
    }
    if (params.highlights !== undefined) {
        updateData.highlights = Array.isArray(params.highlights) ? params.highlights : (params.highlights ? [params.highlights] : []);
    }

    Object.assign(job, updateData);
    await job.save();
    return job;
}

/**
 * Delete a job advert by ID
 */
async function _delete(id) {
    const job = await getJob(id);
    await job.destroy();
}

/**
 * Bulk import job listings ensuring only unique jobs are stored
 * @param {Array} jobsList - Array of job objects
 * @param {Object} [options] - { deduplicate: boolean, updateExisting: boolean }
 */
async function bulkImport(jobsList, options = { deduplicate: true, updateExisting: false }) {
    if (!Array.isArray(jobsList)) throw new Error('Expected an array of job objects');

    const Job = getJobModel();
    const deduplicateFlag = options.deduplicate !== false;
    const updateExisting = options.updateExisting === true;

    const existingJobs = await Job.findAll();
    const created = [];
    const updated = [];
    const duplicateTitles = [];
    let skippedDuplicates = 0;

    for (const item of jobsList) {
        if (!item || typeof item !== 'object') continue;
        const title = item.jobTitle || item.title;
        const company = item.company;
        if (!title && !company) continue;

        if (deduplicateFlag) {
            const match = existingJobs.find(existing => isDuplicate(item, existing));
            if (match) {
                duplicateTitles.push(title || match.jobTitle);
                skippedDuplicates++;

                if (updateExisting) {
                    let hasUpdates = false;
                    if (!match.salary && item.salary) {
                        match.salary = item.salary;
                        hasUpdates = true;
                    }
                    if (!match.employmentType && (item.employmentType || item.employment_type)) {
                        match.employmentType = item.employmentType || item.employment_type;
                        hasUpdates = true;
                    }
                    if ((!match.highlights || match.highlights.length === 0) && item.highlights) {
                        match.highlights = Array.isArray(item.highlights) ? item.highlights : [item.highlights];
                        hasUpdates = true;
                    }
                    if ((!match.url || match.url === '#' || match.url === 'https://') && item.url && item.url !== '#') {
                        match.url = item.url;
                        hasUpdates = true;
                    }
                    if (hasUpdates) {
                        await match.save();
                        updated.push(match);
                    }
                }
                continue;
            }
        }

        const newJob = await Job.create({
            jobTitle: title || 'Untitled Role',
            company: company || 'Unknown Company',
            advertDate: item.advertDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
            url: item.url || '#',
            area: (item.area || item.location || 'Remote / Global').trim(),
            salary: item.salary || null,
            employmentType: item.employmentType || item.employment_type || null,
            highlights: Array.isArray(item.highlights) ? item.highlights : (item.highlights ? [item.highlights] : [])
        });

        created.push(newJob);
        existingJobs.push(newJob);
    }

    return {
        created,
        updated,
        createdCount: created.length,
        skippedDuplicates,
        updatedCount: updated.length,
        totalProcessed: jobsList.length,
        duplicateTitles: [...new Set(duplicateTitles)]
    };
}

/**
 * Scan existing database jobs and purge duplicate records, retaining the richest record
 */
async function deduplicate() {
    const Job = getJobModel();
    const allJobs = await Job.findAll();
    const seen = [];
    const toDelete = [];

    for (const job of allJobs) {
        const match = seen.find(s => isDuplicate(s, job));
        if (match) {
            let needsSave = false;
            if (!match.salary && job.salary) {
                match.salary = job.salary;
                needsSave = true;
            }
            if (!match.employmentType && job.employmentType) {
                match.employmentType = job.employmentType;
                needsSave = true;
            }
            if ((!match.highlights || match.highlights.length === 0) && job.highlights && job.highlights.length > 0) {
                match.highlights = job.highlights;
                needsSave = true;
            }
            if ((!match.url || match.url === '#') && job.url && job.url !== '#') {
                match.url = job.url;
                needsSave = true;
            }
            if (needsSave) {
                await match.save();
            }
            toDelete.push(job);
        } else {
            seen.push(job);
        }
    }

    for (const dup of toDelete) {
        await dup.destroy();
    }

    return {
        removedCount: toDelete.length,
        remainingCount: seen.length,
        removedJobs: toDelete.map(j => ({ id: j.id, title: j.jobTitle, company: j.company }))
    };
}

/**
 * Helper to fetch job by primary key or throw 404
 */
async function getJob(id) {
    const Job = getJobModel();
    const job = await Job.findByPk(id);
    if (!job) throw new Error('Job advert not found');
    return job;
}
