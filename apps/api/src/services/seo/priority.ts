/**
 * Shared priority calculation utilities.
 *
 * Priority formula:
 *   priority = (volumeScore * 0.35) + (positionScore * 0.25) + (difficultyScore * 0.25) + (effortScore * 0.15)
 *
 * Used by: Action Plan, Brief Recommendations
 */

/**
 * Normalize a value to 0-100 scale.
 */
export function normalizeScore(value: number, max: number): number {
	return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * Calculate weighted priority score.
 * All inputs should be 0-100 scale.
 */
export function calculatePriority(
	volumeScore: number,
	positionScore: number,
	difficultyScore: number,
	effortScore: number,
): number {
	return Math.round(
		volumeScore * 0.35 +
			positionScore * 0.25 +
			difficultyScore * 0.25 +
			effortScore * 0.15,
	);
}
