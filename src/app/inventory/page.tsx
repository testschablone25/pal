import { InventoryList } from "@/components/inventory-list";

export default function InventoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Inventory</h1>
        <p className="text-zinc-400 mt-2">
          Manage equipment, track locations, and monitor conditions
        </p>
      </div>
      <InventoryList />
    </div>
  );
}
