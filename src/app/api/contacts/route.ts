// Contacts API — Telephone Book
// Aggregates staff profiles + venue contacts into one searchable directory
// Deduplicates by matching name+email, and groups all associations per person

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

interface VenueAssociation {
	id: string;
	name: string;
}

interface ContactEntry {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	/** Primary role for display */
	role: string | null;
	/** All staff roles this person has */
	staff_roles: string[];
	/** All venues this person manages/is contact for */
	venues: VenueAssociation[];
}

// GET /api/contacts — List all contacts with optional search
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "CONTACTS_READ");
		if (!auth.authorized) return auth.response;

		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get("q")?.toLowerCase().trim() || "";

		// 1. Fetch staff with profiles
		const { data: staffData, error: staffError } = await supabase
			.from("staff")
			.select(
				`
				id,
				role,
				profiles:profile_id (
					id,
					full_name,
					email,
					phone
				)
			`,
			)
			.not("profile_id", "is", null);

		if (staffError) {
			console.error("Error fetching staff contacts:", staffError.message);
		}

		// 2. Fetch venue contacts
		const { data: venueData, error: venueError } = await supabase
			.from("venues")
			.select("id, name, contact_name, contact_phone, contact_email")
			.not("contact_name", "is", null)
			.neq("contact_name", "");

		if (venueError) {
			console.error("Error fetching venue contacts:", venueError.message);
		}

		// 3. Build deduplicated contact map — keyed by normalized name+email
		//    (so "Oliver Jeschke" + "oliver@pal.com" appears once)
		const contactMap = new Map<string, ContactEntry>();

		// Add staff contacts
		if (staffData) {
			for (const s of staffData) {
				const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
				if (!profile) continue;

				const name = profile.full_name?.trim();
				if (!name) continue;

				const key = `${name}|${profile.email || ""}`;

				if (contactMap.has(key)) {
					// Merge staff role into existing entry
					const existing = contactMap.get(key)!;
					const roleStr = s.role || "Staff";
					if (!existing.staff_roles.includes(roleStr)) {
						existing.staff_roles.push(roleStr);
					}
					// Update primary role to most specific
					if (existing.staff_roles.length > 0) {
						existing.role = existing.staff_roles.join(", ");
					}
				} else {
					contactMap.set(key, {
						id: `person-${key}`,
						name,
						phone: profile.phone || null,
						email: profile.email || null,
						role: s.role || "Staff",
						staff_roles: s.role ? [s.role] : [],
						venues: [],
					});
				}
			}
		}

		// Add venue contacts
		if (venueData) {
			for (const v of venueData) {
				const name = v.contact_name?.trim();
				if (!name) continue;

				const email = v.contact_email || "";
				const key = `${name}|${email}`;

				if (contactMap.has(key)) {
					// Merge venue into existing entry
					const existing = contactMap.get(key)!;
					existing.venues.push({ id: v.id, name: v.name });
					// Fill in phone/email from venue if staff didn't have it
					if (!existing.phone && v.contact_phone) {
						existing.phone = v.contact_phone;
					}
					if (!existing.email && v.contact_email) {
						existing.email = v.contact_email;
					}
				} else {
					contactMap.set(key, {
						id: `person-${key}`,
						name,
						phone: v.contact_phone || null,
						email: v.contact_email || null,
						role: "Venue Manager",
						staff_roles: [],
						venues: [{ id: v.id, name: v.name }],
					});
				}
			}
		}

		// 4. Convert map to array
		let contacts = Array.from(contactMap.values());

		// 5. Filter by search query
		if (query) {
			contacts = contacts.filter(
				(c) =>
					c.name.toLowerCase().includes(query) ||
					(c.phone?.toLowerCase() || "").includes(query) ||
					(c.email?.toLowerCase() || "").includes(query) ||
					(c.role?.toLowerCase() || "").includes(query) ||
					c.venues.some((v) => v.name.toLowerCase().includes(query)),
			);
		}

		// 6. Sort alphabetically by name
		contacts.sort((a, b) => a.name.localeCompare(b.name));

		return NextResponse.json({
			contacts,
			total: contacts.length,
		});
	} catch (error) {
		console.error("Error fetching contacts:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
