export function isNullOrUndefined(obj: any): boolean {
    if (obj === null) return true;
    if (obj === undefined) return true;

    return false;
}

export function isDefined(obj: any): boolean {
    return !isNullOrUndefined(obj);
}