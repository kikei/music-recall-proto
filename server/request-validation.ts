// Marks errors caused by a request value. Routes may safely return these as
// 400; database, provider, and programming errors must keep propagating.
export class RequestValidationError extends Error {}
