/**
 * Create staff accounts with real names and multi-role assignments
 *
 * Run with: npx tsx scripts/create-staff-accounts.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error(
		"Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const PASSWORD = "Test1234!";

interface StaffAccount {
	email: string;
	full_name: string;
	roles: string[];
}

const staffAccounts: StaffAccount[] = [
	{
		email: "andre.stubbs@pal.test",
		full_name: "Andre Stubbs",
		roles: ["manager"],
	},
	{
		email: "david.schürmann@pal.test",
		full_name: "David Schürmann",
		roles: ["manager"],
	},
	{
		email: "mary.abel@pal.test",
		full_name: "Mary Abel",
		roles: ["manager"],
	},
	{
		email: "alexander.kubczak@pal.test",
		full_name: "Alexander Kubczak",
		roles: ["admin"],
	},
	{
		email: "johann.strutz@pal.test",
		full_name: "Johann Strutz",
		roles: ["azubi", "booking", "staff", "social-media"],
	},
	{
		email: "anton.jonathan@pal.test",
		full_name: "Anton Jonathan",
		roles: ["azubi", "booking", "staff", "social-media"],
	},
	{
		email: "oliver.jeschke@pal.test",
		full_name: "Oliver Jeschke",
		roles: [
			"manager",
			"tech-lead",
			"label",
			"tech",
			"staff",
			"social-media",
			"booking",
		],
	},
	{
		email: "gordon.miles@pal.test",
		full_name: "Gordon Miles",
		roles: ["staff", "booking", "tech"],
	},
	{
		email: "jeldrik.henschel@pal.test",
		full_name: "Jeldrik Henschel",
		roles: ["tech", "staff", "social-media", "label", "booking"],
	},
	{
		email: "lea.wagenknecht@pal.test",
		full_name: "Lea Marie Wagenknecht",
		roles: ["night-management", "staff", "backoffice"],
	},
	{
		email: "linus@pal.test",
		full_name: "Linus",
		roles: ["night-management", "staff"],
	},
	{
		email: "marvin@pal.test",
		full_name: "Marvin",
		roles: ["staff"],
	},
	{
		email: "mahoni@pal.test",
		full_name: "Mahoni",
		roles: ["staff"],
	},
	{
		email: "max@pal.test",
		full_name: "Max",
		roles: ["gastro", "staff", "backoffice"],
	},
	{
		email: "lu@pal.test",
		full_name: "Lu",
		roles: ["gastro", "staff"],
	},
	{
		email: "roses@pal.test",
		full_name: "Roses",
		roles: ["gastro", "staff"],
	},
	{
		email: "nathalie.teflon@pal.test",
		full_name: "Nathalie Teflon",
		roles: ["backoffice"],
	},
	{
		email: "tillmann@pal.test",
		full_name: "Tillmann",
		roles: ["staff", "tech"],
	},
];

async function userExists(email: string): Promise<string | null> {
	const { data: existingUsers, error: listError } =
		await supabase.auth.admin.listUsers();

	if (listError) {
		console.error(`Error listing users: ${listError.message}`);
		return null;
	}

	const existingUser = existingUsers.users.find((u) => u.email === email);
	return existingUser?.id ?? null;
}

async function ensureProfile(userId: string, email: string, fullName: string) {
	const { data: existingProfile } = await supabase
		.from("profiles")
		.select("id")
		.eq("id", userId)
		.single();

	if (!existingProfile) {
		const { error } = await supabase.from("profiles").insert({
			id: userId,
			email,
			full_name: fullName,
		});
		if (error) {
			console.error(`  → Error creating profile: ${error.message}`);
		} else {
			console.log(`  ✅ Profile created`);
		}
	} else {
		console.log(`  ℹ️  Profile already exists`);
	}
}

async function ensureRoles(userId: string, roles: string[]) {
	for (const role of roles) {
		const { data: existingRole } = await supabase
			.from("user_roles")
			.select("id")
			.eq("user_id", userId)
			.eq("role", role)
			.single();

		if (!existingRole) {
			const { error } = await supabase.from("user_roles").insert({
				user_id: userId,
				role,
			});
			if (error) {
				console.error(`  → Error assigning role '${role}': ${error.message}`);
			} else {
				console.log(`  ✅ Role '${role}' assigned`);
			}
		} else {
			console.log(`  ℹ️  Role '${role}' already assigned`);
		}
	}
}

async function createStaffAccounts() {
	console.log("🚀 Creating staff accounts for PAL...\n");

	let created = 0;
	let skipped = 0;
	let failed = 0;

	for (const account of staffAccounts) {
		console.log(`\n--- ${account.email} (${account.full_name}) ---`);

		try {
			const existingUserId = await userExists(account.email);

			if (existingUserId) {
				console.log(`ℹ️  User already exists (ID: ${existingUserId})`);
				await ensureProfile(existingUserId, account.email, account.full_name);
				await ensureRoles(existingUserId, account.roles);
				skipped++;
				continue;
			}

			// Create auth user
			const { data: authData, error: authError } =
				await supabase.auth.admin.createUser({
					email: account.email,
					password: PASSWORD,
					email_confirm: true,
					user_metadata: {
						full_name: account.full_name,
					},
				});

			if (authError) {
				console.error(`❌ Error creating user: ${authError.message}`);
				failed++;
				continue;
			}

			console.log(`✅ Auth user created (ID: ${authData.user.id})`);

			// Create profile
			await ensureProfile(authData.user.id, account.email, account.full_name);

			// Assign all roles
			await ensureRoles(authData.user.id, account.roles);

			created++;
		} catch (error) {
			console.error(`❌ Unexpected error for ${account.email}:`, error);
			failed++;
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log("📊 SUMMARY");
	console.log("=".repeat(60));
	console.log(`✅ Created: ${created}`);
	console.log(`ℹ️  Already existed (profile/roles ensured): ${skipped}`);
	console.log(`❌ Failed: ${failed}`);
	console.log(`📧 Password for all: ${PASSWORD}`);
	console.log("=".repeat(60));
}

createStaffAccounts().catch(console.error);
