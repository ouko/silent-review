import { Router } from "express";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export const productsRouter = Router();

productsRouter.get("/search", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    if (!q) {
      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      res.json({ products });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { searchVector: { contains: q.toLowerCase(), mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json({ products });
  } catch (err) {
    next(err);
  }
});

productsRouter.post("/", async (req, res, next) => {
  try {
    const { name, brand, category, description } = req.body;
    if (!name || !category) {
      res.status(400).json({ error: "Name and category are required" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        brand,
        category,
        description,
        tags: [category.toLowerCase(), brand?.toLowerCase()].filter(Boolean),
        searchVector: `${name} ${brand ?? ""} ${category}`.toLowerCase(),
      },
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});
