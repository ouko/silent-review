import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { Search, Plus, X, ChevronRight, Tag } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
}

interface ProductSearchProps {
  selected: Product | null;
  onSelect: (product: Product) => void;
}

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Beauty",
  "Home",
  "Sports",
  "Food",
  "Toys",
  "Automotive",
  "Books",
  "Health",
  "Other",
];

export function ProductSearch({ selected, onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", category: "Other" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setProducts([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get(`/api/products/search?q=${encodeURIComponent(query)}`);
        setProducts((data.products ?? []) as Product[]);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const name = newProduct.name.trim();
    const category = newProduct.category || "Other";
    if (!name) return;

    try {
      const { data } = await api.post("/api/products", { ...newProduct, name, category });
      onSelect(data.product as Product);
      setShowAdd(false);
      setNewProduct({ name: "", brand: "", category: "Other" });
      setQuery("");
      setProducts([]);
    } catch {
      alert("Could not add product. Try again.");
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
            <Tag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">{selected.name}</p>
            <p className="text-xs text-white/50">
              {selected.brand} • {selected.category}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSelect(null as unknown as Product)}
          className="rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Change product"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const noResults = !loading && query.trim().length > 0 && products.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/40 outline-none transition-colors focus:border-white/20 focus:bg-white/10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.slice(0, 6).map((cat) => (
          <button
            key={cat}
            onClick={() => setQuery(cat)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-rose-500" />
        </div>
      )}

      <AnimatePresence>
        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="max-h-56 overflow-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setProducts([]);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/10"
              >
                <div>
                  <div className="font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-white/50">
                    {p.brand} • {p.category}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!showAdd && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          {noResults ? `Add "${query.trim()}" as a new product` : "Add new product"}
        </motion.button>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddProduct}
            className="space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <input
              placeholder="Product name"
              value={newProduct.name}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-white/20"
            />
            <input
              placeholder="Brand (optional)"
              value={newProduct.brand}
              onChange={(e) => setNewProduct((p) => ({ ...p, brand: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-white/20"
            />
            <select
              value={newProduct.category}
              onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-white/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!newProduct.name.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Product
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
