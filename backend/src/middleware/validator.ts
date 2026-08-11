export function validatePagination(pageQuery?: any, limitQuery?: any, defaultLimit = 10) {
  let page = 1;
  let limit = defaultLimit;

  if (pageQuery !== undefined && pageQuery !== "") {
    const p = Number(pageQuery);
    if (!Number.isInteger(p) || p < 1) {
      throw { status: 400, message: "Page must be a positive integer >= 1" };
    }
    page = p;
  }

  if (limitQuery !== undefined && limitQuery !== "") {
    const l = Number(limitQuery);
    if (!Number.isInteger(l) || l < 1 || l > 100) {
      throw { status: 400, message: "Limit must be an integer between 1 and 100" };
    }
    limit = l;
  }

  return { page, limit, offset: (page - 1) * limit };
}

export function isNonNegativeInteger(val: any): boolean {
  if (val === undefined || val === null || val === "") return false;
  const n = Number(val);
  return Number.isInteger(n) && n >= 0;
}

export function isPositiveInteger(val: any): boolean {
  if (val === undefined || val === null || val === "") return false;
  const n = Number(val);
  return Number.isInteger(n) && n > 0;
}

export function isNonNegativeNumber(val: any): boolean {
  if (val === undefined || val === null || val === "") return false;
  const n = Number(val);
  return !isNaN(n) && isFinite(n) && n >= 0;
}
