"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

const staffSchema = z.object({
	full_name: z.string().min(1, "Name is required"),
	profile_id: z.string().uuid().optional().or(z.literal("")),
	role: z.string().min(1, "Role is required"),
	contract_type: z.enum(["permanent", "freelance"]),
	link_user: z.boolean().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface ProfileOption {
	id: string;
	full_name: string | null;
	email: string | null;
}

interface StaffFormProps {
	staff?: {
		id: string;
		profile_id: string | null;
		role: string;
		contract_type: "permanent" | "freelance";
		profiles?: {
			full_name: string | null;
			email: string | null;
		} | null;
	};
	mode?: "create" | "edit";
}

const STAFF_ROLES = [
	"Bar Staff",
	"Security",
	"Door Staff",
	"Cloakroom",
	"Cleaner",
	"Manager",
	"Sound Engineer",
	"Lighting",
	"VIP Host",
	"Runner",
	"Tech Lead",
	"Backoffice",
	"Booking",
	"Gastro",
	"Night Management",
	"Trainee",
	"Awareness",
	"Social Media",
	"Label",
	"Staff",
	"Extern",
];

export function StaffForm({ staff, mode = "create" }: StaffFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [profiles, setProfiles] = useState<ProfileOption[]>([]);
	const [profilesLoading, setProfilesLoading] = useState(true);

	useEffect(() => {
		fetch("/api/profiles")
			.then((res) => res.json())
			.then((data) => setProfiles(data.profiles || []))
			.catch(() => setProfiles([]))
			.finally(() => setProfilesLoading(false));
	}, []);

	const form = useForm<StaffFormValues>({
		resolver: zodResolver(staffSchema),
		defaultValues: {
			full_name: staff?.profiles?.full_name || staff?.profiles?.email || "",
			profile_id: staff?.profile_id || "",
			role: staff?.role || "",
			contract_type: staff?.contract_type || "permanent",
			link_user: !!staff?.profile_id,
		},
	});

	const linkUser = form.watch("link_user");

	const onSubmit = async (values: StaffFormValues) => {
		setLoading(true);
		setError(null);

		try {
			const url = mode === "create" ? "/api/staff" : `/api/staff/${staff?.id}`;

			const response = await fetch(url, {
				method: mode === "create" ? "POST" : "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					full_name: values.full_name.trim(),
					profile_id: linkUser ? values.profile_id || undefined : undefined,
					role: values.role,
					contract_type: values.contract_type,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to save staff member");
			}

			router.push("/staff");
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
			<CardHeader>
				<CardTitle className="text-white">
					{mode === "create" ? "Add New Staff Member" : "Edit Staff Member"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Full Name — always required */}
							<FormField
								control={form.control}
								name="full_name"
								render={({ field }) => (
									<FormItem className="md:col-span-2">
										<FormLabel>Full Name *</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g. Max Mustermann"
												{...field}
												className="bg-zinc-950 border-zinc-800"
											/>
										</FormControl>
										<FormDescription className="text-zinc-400">
											The staff member&apos;s display name
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Optional user account linking */}
							<FormField
								control={form.control}
								name="link_user"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-800 p-4 md:col-span-2">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
												className="border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel className="flex items-center gap-1">
												<UserPlus className="h-3 w-3" />
												Link to existing user account
											</FormLabel>
											<FormDescription className="text-zinc-400">
												Only needed if this person logs into PAL
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>

							{linkUser && (
								<FormField
									control={form.control}
									name="profile_id"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>Select User *</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
												disabled={profilesLoading}
											>
												<FormControl>
													<SelectTrigger className="bg-zinc-950 border-zinc-800">
														<SelectValue
															placeholder={
																profilesLoading
																	? "Loading users..."
																	: "Select a user"
															}
														/>
													</SelectTrigger>
												</FormControl>
												<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
													{profiles
														.filter(
															(p) =>
																!p.email?.startsWith("staff-") ||
																p.email?.endsWith("@pal.club"),
														)
														.map((profile) => (
															<SelectItem key={profile.id} value={profile.id}>
																{profile.full_name ||
																	profile.email ||
																	profile.id.substring(0, 8)}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
											<FormDescription className="text-zinc-400">
												Link to a registered PAL user
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role *</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
												{STAFF_ROLES.map((role) => (
													<SelectItem key={role} value={role}>
														{role}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="contract_type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Contract Type *</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="bg-zinc-950 border-zinc-800">
													<SelectValue placeholder="Select contract type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
												<SelectItem value="permanent">Permanent</SelectItem>
												<SelectItem value="freelance">Freelance</SelectItem>
											</SelectContent>
										</Select>
										<FormDescription className="text-zinc-400">
											Employment contract type
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{error && <div className="text-red-500 text-sm">{error}</div>}

						<div className="flex gap-4">
							<Button
								type="submit"
								className="bg-violet-600 hover:bg-violet-700"
								disabled={loading}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{mode === "create" ? "Create Staff Member" : "Save Changes"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
								className="border-zinc-700"
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
