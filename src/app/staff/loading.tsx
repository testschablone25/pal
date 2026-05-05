import { PageSkeleton } from "@/components/page-skeleton";

export default function StaffLoading() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<PageSkeleton rows={6} />
		</div>
	);
}
