"use client";

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	useCallback,
	type ReactNode,
} from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";
import { type AppRole } from "@/lib/permissions";

interface UserContextType {
	userId: string | null;
	userEmail: string | null;
	userRoles: AppRole[];
	loading: boolean;
	refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
	userId: null,
	userEmail: null,
	userRoles: [],
	loading: true,
	refresh: async () => {},
});

export function UserProvider({
	children,
	initialRoles,
}: {
	children: ReactNode;
	initialRoles?: AppRole[];
}) {
	const [userId, setUserId] = useState<string | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [userRoles, setUserRoles] = useState<AppRole[]>(initialRoles || []);
	const [loading, setLoading] = useState(true);
	const mountedRef = useRef(false);
	const hydratedRoles = useRef(!!initialRoles && initialRoles.length > 0);

	const doFetch = useCallback(async () => {
		try {
			const supabase = createBrowserClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				// Only clear roles if we had no SSR head-start — avoids flash
				if (!hydratedRoles.current) {
					setUserId(null);
					setUserEmail(null);
					setUserRoles([]);
				}
				return;
			}
			setUserId(user.id);
			setUserEmail(user.email ?? null);

			const { data } = await supabase
				.from("user_roles")
				.select("role")
				.eq("user_id", user.id);
			setUserRoles(data?.map((r: { role: string }) => r.role as AppRole) ?? []);

			// Mark as hydrated so auth-state-change handler won't re-fetch
			hydratedRoles.current = true;
		} catch (err) {
			console.error("UserProvider: failed to fetch roles", err);
		}
	}, []);

	// Mount effect: single explicit fetch, then mark loading done
	useEffect(() => {
		if (mountedRef.current) return;
		mountedRef.current = true;
		doFetch().finally(() => setLoading(false));
	}, [doFetch]);

	// Auth state listener: skip INITIAL_SESSION (handled by mount fetch),
	// and only react to actual SIGNED_IN / SIGNED_OUT.
	useEffect(() => {
		const supabase = createBrowserClient();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === "SIGNED_OUT") {
				setUserId(null);
				setUserEmail(null);
				setUserRoles([]);
				hydratedRoles.current = false;
				return;
			}

			// INITIAL_SESSION is redundant because doFetch already handled it.
			// Only SIGNED_IN (actual login or token refresh callback) should re-fetch.
			if (event === "SIGNED_IN" && session?.user) {
				// Avoid racing with the mount fetch — if already hydrated, skip
				if (hydratedRoles.current) return;

				setLoading(true);
				try {
					setUserId(session.user.id);
					setUserEmail(session.user.email ?? null);
					const { data } = await supabase
						.from("user_roles")
						.select("role")
						.eq("user_id", session.user.id);
					setUserRoles(
						data?.map((r: { role: string }) => r.role as AppRole) ?? [],
					);
					hydratedRoles.current = true;
				} catch (err) {
					console.error(
						"UserProvider: failed to fetch roles on auth event",
						err,
					);
				} finally {
					setLoading(false);
				}
			}
		});
		return () => subscription.unsubscribe();
	}, []);

	return (
		<UserContext.Provider
			value={{ userId, userEmail, userRoles, loading, refresh: doFetch }}
		>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
