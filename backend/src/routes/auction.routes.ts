import { Router } from 'express';
import {
  createAuctionController,
  getMyAuctionsController,
} from '../controllers/auction.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createAuctionSchema } from '../services/auction.schemas';

const router = Router();

router.use(authenticate);
router.use(requireRole('SELLER'));

router.post('/', validateBody(createAuctionSchema), createAuctionController);

router.get('/my', getMyAuctionsController);

export default router;
