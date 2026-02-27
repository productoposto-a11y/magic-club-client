/**
 * Extracts a human-readable error message from an Axios error response.
 * Handles both backend formats:
 *   - { "error": "string message" }          (notFound, serverError, etc.)
 *   - { "error": { "message": "..." } }      (badRequest)
 *   - { "error": { "field": "msg", ... } }   (validation errors)
 */
export function extractApiError(err: any, fallback: string = 'Error inesperado.'): string {
    const data = err?.response?.data;
    if (!data?.error) return fallback;

    const error = data.error;

    // Format: { "error": "plain string" }
    if (typeof error === 'string') return error;

    // Format: { "error": { "message": "..." } }
    if (typeof error === 'object' && error.message) return error.message;

    // Format: { "error": { "email": "...", "password": "..." } } (validation)
    if (typeof error === 'object') {
        const firstValue = Object.values(error)[0];
        if (typeof firstValue === 'string') return firstValue;
    }

    return fallback;
}
