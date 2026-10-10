module.exports = validateRequest;

/**
 * Standard request validation middleware using Joi
 * Supports both (req, next, schema) and (req, res, next, schema) signatures
 */
function validateRequest(req, resOrNext, schemaOrNext, maybeSchema) {
    let res;
    let next;
    let schema;

    if (typeof schemaOrNext === 'function') {
        // Called as validateRequest(req, res, next, schema)
        res = resOrNext;
        next = schemaOrNext;
        schema = maybeSchema;
    } else {
        // Standard Jason Watmore pattern: validateRequest(req, next, schema)
        next = resOrNext;
        schema = schemaOrNext;
    }

    const options = {
        abortEarly: false, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: true  // remove unknown props
    };

    if (!schema) {
        return next();
    }

    const { error, value } = schema.validate(req.body, options);
    if (error) {
        const message = `Validation error: ${error.details.map(x => x.message).join(', ')}`;
        if (res && typeof res.status === 'function') {
            return res.status(400).json({ message });
        }
        return next(message);
    }

    req.body = value;
    next();
}
