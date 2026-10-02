// src/BACKEND/utils/http.cjs
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new HttpError(400, msg);
const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

module.exports = { HttpError, badRequest, forbidden, notFound, isObjectId };
