import { AuctionStatus, Prisma } from '../generated/prisma/client';
import { prisma } from '../prisma';
import { AppError } from '../utils/app-error';
import type { CreateAuctionInput } from './auction.schemas';

export const createAuction = async (sellerId: number, input: CreateAuctionInput) => {
  const seller = await prisma.user.findUnique({
    where: {
      id: sellerId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!seller || !seller.isActive) {
    throw new AppError(404, 'Seller account not found or inactive');
  }

  if (seller.role !== 'SELLER') {
    throw new AppError(403, 'Only sellers can create auctions');
  }

  const category = await prisma.category.findUnique({
    where: {
      id: input.categoryId,
    },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  const auction = await prisma.auction.create({
    data: {
      sellerId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      startingPrice: new Prisma.Decimal(input.startingPrice),
      reservePrice:
        input.reservePrice !== undefined ? new Prisma.Decimal(input.reservePrice) : null,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      status: AuctionStatus.SCHEDULED,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return auction;
};

export const getMyAuctions = async (sellerId: number) => {
  const auctions = await prisma.auction.findMany({
    where: {
      sellerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return auctions;
};
