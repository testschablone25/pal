"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const contactSchema = z.object({
	name: z.string().min(1, "Name is required"),
	phone: z.string().optional().or(z.literal("")),
	email: z.string().email("Invalid email").optional().or(z.literal("")),
	role: z.string().optional().or(z.literal("")),
	company: z.string().optional().or(z.literal("")),
	notes: z.string().optional().or(z.literal("")),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactData {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	role: string | null;
	company: string | null;
	notes: string | null;
	created_by: string | null;
	created_at: string;
}

interface ContactFormProps {
	mode?: "create" | "edit";
	initialData?: ContactFormValues & { id?: string };
	onSuccess: (contact: ContactData) => void;
	onCancel?: () => void;
}

export function ContactForm({
	mode = "create",
	initialData,
	onSuccess,
	onCancel,
}: ContactFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactSchema),
		defaultValues: {
			name: initialData?.name || "",
			phone: initialData?.phone || "",
			email: initialData?.email || "",
			role: initialData?.role || "",
			company: initialData?.company || "",
			notes: initialData?.notes || "",
		},
	});

	const onSubmit = async (values: ContactFormValues) => {
		setLoading(true);
		setError(null);

		try {
			if (mode === "create") {
				const response = await fetch("/api/contacts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(values),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to create contact");
				}

				const contact = await response.json();
				onSuccess(contact);
			} else if (initialData?.id) {
				const response = await fetch(`/api/contacts/${initialData.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(values),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to update contact");
				}

				const contact = await response.json();
				onSuccess(contact);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name *</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="Contact name"
									className="bg-zinc-950 border-zinc-800"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="phone"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Phone</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="+49 123 456789"
										className="bg-zinc-950 border-zinc-800"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="email"
										placeholder="contact@example.com"
										className="bg-zinc-950 border-zinc-800"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="role"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Role</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="e.g. Promoter, Booker"
										className="bg-zinc-950 border-zinc-800"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="company"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Company</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="Company name"
										className="bg-zinc-950 border-zinc-800"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									placeholder="Additional notes..."
									className="bg-zinc-950 border-zinc-800 min-h-[80px]"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{error && <div className="text-red-500 text-sm">{error}</div>}

				<div className="flex gap-3 pt-2">
					<Button
						type="submit"
						className="bg-violet-600 hover:bg-violet-700"
						disabled={loading}
					>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{mode === "create" ? "Add Contact" : "Save Changes"}
					</Button>
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							className="border-zinc-700"
						>
							Cancel
						</Button>
					)}
				</div>
			</form>
		</Form>
	);
}
