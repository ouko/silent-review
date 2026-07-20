import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";

export interface Product {
  id: string;
  name: string;
  brand: string | null;
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
];

export function ProductSearch({ selected, onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", category: "" });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setProducts([]);
        return;
      }
      try {
        const { data } = await api.get(`/api/products/search?q=${encodeURIComponent(query)}`);
        setProducts((data.products ?? []) as Product[]);
      } catch {
        setProducts([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/products", newProduct);
      onSelect(data.product as Product);
      setShowAdd(false);
      setNewProduct({ name: "", brand: "", category: "" });
    } catch {
      alert("Could not add product");
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
        <span>{selected.name}</span>
        <button onClick={() => onSelect(null as unknown as Product)} className="text-sm text-white/50">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.slice(0, 6).map((cat) => (
          <button
            key={cat}
            onClick={() => setQuery(cat)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20"
          >
            {cat}
          </button>
        ))}
      </div>

      {products.length > 0 && (
        <div className="max-h-48 overflow-auto rounded-xl bg-white/5">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setProducts([]);
                setQuery("");
              }}
              className="w-full px-4 py-3 text-left hover:bg-white/10"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-white/50">
                {p.brand} • {p.category}
              </div>
            </button>
          ))}
        </div>
      )}

      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} className="text-sm text-brand-500">
          + Add new product
        </button>
      ) : (
        <form onSubmit={handleAddProduct} className="space-y-2 rounded-xl bg-white/5 p-3">
          <input
            placeholder="Product name"
            value={newProduct.name}
            onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <input
            placeholder="Brand"
            value={newProduct.brand}
            onChange={(e) => setNewProduct((p) => ({ ...p, brand: e.target.value }))}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <select
            value={newProduct.category}
            onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button type="submit" className="w-full">
            Add Product
          </Button>
        </form>
      )}
    </div>
  );
}
