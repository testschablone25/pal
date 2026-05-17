import { InventoryDetail } from "@/components/inventory-detail";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <InventoryDetail itemId={id} />
    </div>
  );
}
