"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Loader2,
	User,
	Lock,
	Save,
	CheckCircle2,
	Eye,
	EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/browser";

export default function SettingsPage() {
	const router = useRouter();
	const supabase = createClient();

	// Profile state
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [userId, setUserId] = useState<string | null>(null);
	const [loadingProfile, setLoadingProfile] = useState(true);
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileSuccess, setProfileSuccess] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);

	// Password state
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [changingPassword, setChangingPassword] = useState(false);
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	// Fetch current user profile
	useEffect(() => {
		async function loadProfile() {
			try {
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();
				if (authError || !user) {
					router.push("/login?redirect=/settings");
					return;
				}
				setUserId(user.id);
				setEmail(user.email ?? "");

				// Fetch profile from profiles table
				const { data: profile } = await supabase
					.from("profiles")
					.select("full_name")
					.eq("id", user.id)
					.single();

				if (profile) {
					setFullName(profile.full_name ?? "");
				}
			} catch (err) {
				console.error("Failed to load profile", err);
			} finally {
				setLoadingProfile(false);
			}
		}

		loadProfile();

		// Safety timeout: if loading takes >8s, show the page anyway
		const timeoutId = setTimeout(() => {
			console.warn("Settings: profile load timed out");
			setLoadingProfile(false);
		}, 8000);

		return () => clearTimeout(timeoutId);
	}, [router]);

	// Save profile info
	async function handleSaveProfile(e: React.FormEvent) {
		e.preventDefault();
		setSavingProfile(true);
		setProfileError(null);
		setProfileSuccess(false);

		try {
			const { error } = await supabase
				.from("profiles")
				.update({ full_name: fullName })
				.eq("id", userId);

			if (error) {
				setProfileError(error.message);
				return;
			}

			setProfileSuccess(true);
			setTimeout(() => setProfileSuccess(false), 3000);
		} catch (err) {
			setProfileError(
				err instanceof Error ? err.message : "Failed to save profile",
			);
		} finally {
			setSavingProfile(false);
		}
	}

	// Change password — no email confirmation required
	async function handleChangePassword(e: React.FormEvent) {
		e.preventDefault();
		setPasswordError(null);
		setPasswordSuccess(false);

		if (newPassword !== confirmPassword) {
			setPasswordError("Passwords do not match");
			return;
		}
		if (newPassword.length < 6) {
			setPasswordError("Password must be at least 6 characters");
			return;
		}

		setChangingPassword(true);

		try {
			// Update password via Supabase Auth — no email confirmation needed
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				setPasswordError(error.message);
				return;
			}

			setPasswordSuccess(true);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setTimeout(() => setPasswordSuccess(false), 5000);
		} catch (err) {
			setPasswordError(
				err instanceof Error ? err.message : "Failed to change password",
			);
		} finally {
			setChangingPassword(false);
		}
	}

	if (loadingProfile) {
		return (
			<div className="max-w-2xl mx-auto px-4 py-12">
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-white">Settings</h1>
				<p className="text-zinc-400 mt-1">Manage your account settings</p>
			</div>

			{/* Profile Info */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardHeader>
					<CardTitle className="text-white flex items-center gap-2 text-lg">
						<User className="h-5 w-5 text-violet-400" />
						Profile Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSaveProfile} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-zinc-300">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								value={email}
								disabled
								className="bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed"
							/>
							<p className="text-xs text-zinc-500">
								Email cannot be changed here
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="fullName" className="text-zinc-300">
								Display Name
							</Label>
							<Input
								id="fullName"
								type="text"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								placeholder="Your full name"
								className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
							/>
						</div>

						{profileError && (
							<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
								<p className="text-sm text-red-400">{profileError}</p>
							</div>
						)}

						{profileSuccess && (
							<div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-emerald-400" />
								<p className="text-sm text-emerald-400">Profile saved</p>
							</div>
						)}

						<Button
							type="submit"
							disabled={savingProfile}
							className="bg-violet-600 hover:bg-violet-700 text-white"
						>
							{savingProfile ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Profile
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Password Change */}
			<Card className="bg-zinc-900 border-zinc-800">
				<CardHeader>
					<CardTitle className="text-white flex items-center gap-2 text-lg">
						<Lock className="h-5 w-5 text-violet-400" />
						Change Password
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleChangePassword} className="space-y-4">
						{/* Current Password */}
						<div className="space-y-2">
							<Label htmlFor="currentPassword" className="text-zinc-300">
								Current Password
							</Label>
							<div className="relative">
								<Input
									id="currentPassword"
									type={showCurrentPassword ? "text" : "password"}
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									placeholder="Enter current password"
									className="bg-zinc-800 border-zinc-700 text-white pr-10 placeholder:text-zinc-500"
									required
									disabled={changingPassword}
								/>
								<button
									type="button"
									onClick={() => setShowCurrentPassword(!showCurrentPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
									tabIndex={-1}
								>
									{showCurrentPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<Separator className="bg-zinc-800" />

						{/* New Password */}
						<div className="space-y-2">
							<Label htmlFor="newPassword" className="text-zinc-300">
								New Password
							</Label>
							<div className="relative">
								<Input
									id="newPassword"
									type={showNewPassword ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Enter new password"
									className="bg-zinc-800 border-zinc-700 text-white pr-10 placeholder:text-zinc-500"
									required
									disabled={changingPassword}
									minLength={6}
								/>
								<button
									type="button"
									onClick={() => setShowNewPassword(!showNewPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
									tabIndex={-1}
								>
									{showNewPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							<p className="text-xs text-zinc-500">
								Must be at least 6 characters
							</p>
						</div>

						{/* Confirm New Password */}
						<div className="space-y-2">
							<Label htmlFor="confirmPassword" className="text-zinc-300">
								Confirm New Password
							</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Confirm new password"
									className="bg-zinc-800 border-zinc-700 text-white pr-10 placeholder:text-zinc-500"
									required
									disabled={changingPassword}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
									tabIndex={-1}
								>
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						{passwordError && (
							<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
								<p className="text-sm text-red-400">{passwordError}</p>
							</div>
						)}

						{passwordSuccess && (
							<div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-emerald-400" />
								<p className="text-sm text-emerald-400">
									Password changed successfully
								</p>
							</div>
						)}

						<Button
							type="submit"
							disabled={changingPassword}
							className="bg-violet-600 hover:bg-violet-700 text-white"
						>
							{changingPassword ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Changing Password...
								</>
							) : (
								<>
									<Lock className="h-4 w-4 mr-2" />
									Change Password
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
