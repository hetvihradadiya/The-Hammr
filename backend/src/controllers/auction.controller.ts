import type { Request, Response } from 'express';
import { createAuction, getMyAuctions } from '../services/auction.service';
import type { CreateAuctionInput } from '../services/auction.schemas';

export const createAuctionController = async (req: Request, res: Response) => {
  const sellerId = Number(req.user!.sub);
  const auction = await createAuction(sellerId, req.body as CreateAuctionInput);

  res.status(201).json({
    status: 'success',
    data: {
      auction,
    },
  });
};

export const getMyAuctionsController = async (req: Request, res: Response) => {
  const sellerId = Number(req.user!.sub);
  const auctions = await getMyAuctions(sellerId);

  res.status(200).json({
    status: 'success',
    results: auctions.length,
    data: {
      auctions,
    },
  });
};
