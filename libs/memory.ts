export function getStringFromHashKey(hash: number): string {
    return native<string>("GET_STRING_FROM_HASH_KEY", hash);
}