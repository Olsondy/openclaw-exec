import { create } from "zustand";

export type OperatorStatus = "idle" | "connecting" | "connected" | "error";

interface OperatorState {
	status: OperatorStatus;
	errorMessage: string | null;

	setStatus: (status: OperatorStatus) => void;
	setError: (message: string) => void;
	clearError: () => void;
}

export const useOperatorStore = create<OperatorState>((set) => ({
	status: "idle",
	errorMessage: null,

	setStatus: (status) =>
		set({
			status,
			errorMessage: status !== "error" ? null : undefined,
		}),

	setError: (errorMessage) => set({ errorMessage, status: "error" }),

	clearError: () => set({ errorMessage: null }),
}));
