/**
 * Extract error message from unknown error value.
 * Use in catch blocks to safely get error message.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Unknown error";
}
