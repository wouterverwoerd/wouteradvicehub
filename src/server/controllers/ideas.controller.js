const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const ideaService = require('../services/idea.service');

// routes
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', createSchema, create);
router.put('/:id', updateSchema, update);
router.delete('/:id', _delete);

module.exports = router;

// route functions
function getAll(req, res, next) {
    ideaService.getAll()
        .then(ideas => res.json(ideas))
        .catch(next);
}

function getById(req, res, next) {
    ideaService.getById(req.params.id)
        .then(idea => res.json(idea))
        .catch(next);
}

function create(req, res, next) {
    ideaService.create(req.body)
        .then(idea => res.json({ message: 'Idea created', idea }))
        .catch(next);
}

function update(req, res, next) {
    ideaService.update(req.params.id, req.body)
        .then(idea => res.json({ message: 'Idea updated', idea }))
        .catch(next);
}

function _delete(req, res, next) {
    ideaService.delete(req.params.id)
        .then(() => res.json({ message: 'Idea deleted' }))
        .catch(next);
}

// schema functions
function createSchema(req, res, next) {
    const schema = Joi.object({
        description: Joi.string().required(),
        ideaDate: Joi.string().required(),
        ideaFilename: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        description: Joi.string().empty(''),
        ideaDate: Joi.string().empty(''),
        ideaFilename: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}
