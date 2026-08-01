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
    const users = await store.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await store.getUserById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', createSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await store.createUser(req.body);
    res.json({ message: 'User created' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.put('/:id', updateSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.updateUser(id, req.body);
    res.json({ message: 'User updated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await store.deleteUser(id);
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || err });
  }
});

function createSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid('Admin', 'User').required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  });
  validateRequest(req, res, next, schema);
}

function updateSchema(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object({
    title: Joi.string().allow('', null),
    firstName: Joi.string().allow('', null),
    lastName: Joi.string().allow('', null),
    role: Joi.string().valid('Admin', 'User').allow('', null),
    email: Joi.string().email().allow('', null),
    password: Joi.string().min(6).allow('', null),
    confirmPassword: Joi.string().valid(Joi.ref('password')).allow('', null),
  });
  validateRequest(req, res, next, schema);
}

export default router;
