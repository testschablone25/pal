"use client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
	value: string;
	label: string;
}

export interface SearchFilterProps {
	placeholder?: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
	filters?: Array<{
		key: string;
		label: string;
		options: FilterOption[];
		value: string;
		onChange: (value: string) => void;
	}>;
	className?: string;
}

export function SearchFilterBar({
	placeholder = "Suchen...",
	searchValue,
	onSearchChange,
	filters,
	className,
}: SearchFilterProps) {
	return (
		<div className={cn("flex flex-col sm:flex-row gap-3", className)}>
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
				<Input
					placeholder={placeholder}
					value={searchValue}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-10 bg-zinc-900 border-zinc-800"
				/>
				{searchValue && (
					<button
						onClick={() => onSearchChange("")}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
			{filters?.map((filter) => (
				<Select
					key={filter.key}
					value={filter.value}
					onValueChange={filter.onChange}
				>
					<SelectTrigger className="w-full sm:w-[180px] bg-zinc-900 border-zinc-800">
						<SelectValue placeholder={filter.label} />
					</SelectTrigger>
					<SelectContent>
						{filter.options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			))}
		</div>
	);
}
