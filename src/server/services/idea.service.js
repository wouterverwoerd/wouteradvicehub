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
    delete: _delete
};

function getIdeaModel() {
    const model = db.Idea || db.IdeaModel;
    if (!model) {
        throw new Error(
            'Idea model is undefined on db. Please verify that "db.Idea = require(\'../ideas/idea.model\')(sequelize);" has been added to your _helpers/db.js (or db/sequelize.js).'
        );
    }
    return model;
}

/**
 * Get all ideas
 */
async function getAll() {
    const Idea = getIdeaModel();
    return await Idea.findAll();
}

/**
 * Get idea by id
 */
async function getById(id) {
    return await getIdea(id);
}

/**
 * Create new idea
 */
async function create(params) {
    const Idea = getIdeaModel();
    if (params.description && await Idea.findOne({ where: { description: params.description } })) {
        throw new Error(`Idea with description "${params.description}" already exists`);
    }

    const idea = await Idea.create(params);
    return idea;
}

/**
 * Update idea
 */
async function update(id, params) {
    const Idea = getIdeaModel();
    const idea = await getIdea(id);

    const descriptionChanged = params.description && params.description !== idea.description;
    if (descriptionChanged && await Idea.findOne({ where: { description: params.description } })) {
        throw new Error(`Idea with description "${params.description}" already exists`);
    }

    Object.assign(idea, params);
    await idea.save();
    return idea;
}

/**
 * Delete idea
 */
async function _delete(id) {
    const idea = await getIdea(id);
    await idea.destroy();
}

/**
 * Helper to get idea or throw error
 */
async function getIdea(id) {
    const Idea = getIdeaModel();
    const idea = await Idea.findByPk(id);
    if (!idea) throw new Error('Idea not found');
    return idea;
}
