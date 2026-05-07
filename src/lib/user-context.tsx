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
	userRoles: AppRole[];
	loading: boolean;
	refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
	userId: null,
	userRoles: [],
	loading: true,
	refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
	const [userId, setUserId] = useState<string | null>(null);
	const [userRoles, setUserRoles] = useState<AppRole[]>([]);
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
				setUserRoles([]);
				return;
			}
			setUserId(user.id);
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

	return (
		<UserContext.Provider
			value={{ userId, userRoles, loading, refresh: doFetch }}
		>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
