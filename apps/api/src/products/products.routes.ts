import { Router } from "express";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { searchProducts, createProduct } from "./products.service.js";
import { SearchProductsSchema, CreateProductSchema } from "./products.validation.js";

export const productsRouter = Router();

productsRouter.get("/search", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = SearchProductsSchema.parse(req.query);
    const products = await searchProducts(input);
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

productsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = CreateProductSchema.parse(req.body);
    const product = await createProduct(input);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});
