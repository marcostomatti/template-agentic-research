import type { Router as RouterType } from 'express';

import { Router } from 'express';

export const exampleRouter: RouterType = Router();

exampleRouter.get('/', (_req, res) => {
  res.json({ message: 'hello from template-service-express' });
});
