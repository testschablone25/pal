"use client";
/* eslint-disable react-hooks/set-state-in-effect */

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
	const didFetch = useRef(false);

	const doFetch = useCallback(async () => {
		try {
			const supabase = createBrowserClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setUserId(null);
				setUserEmail(null);
				// Don't wipe server-provided roles if browser session isn't hydrated yet
				// Only clear if we have no initial roles to fall back on
				return;
			}
			setUserId(user.id);
			setUserEmail(user.email ?? null);
			const { data } = await supabase
				.from("user_roles")
				.select("role")
				.eq("user_id", user.id);
			setUserRoles(data?.map((r: { role: string }) => r.role as AppRole) ?? []);
		} catch (err) {
			console.error("UserProvider: failed to fetch roles", err);
		}
	}, []);

	useEffect(() => {
		if (didFetch.current) return;
		didFetch.current = true;
		doFetch().finally(() => setLoading(false));
	}, [doFetch]);

	// Listen for auth state changes to react to login/logout
	useEffect(() => {
		const supabase = createBrowserClient();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === "SIGNED_OUT") {
				setUserId(null);
				setUserEmail(null);
				setUserRoles([]);
				return;
			}
			// INITIAL_SESSION fires when Supabase loads the existing session from
			// cookies on mount; SIGNED_IN fires after an actual sign-in action.
			if (
				(event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
				session?.user
			) {
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
