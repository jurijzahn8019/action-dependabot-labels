/**
 * Helper Type to extract an Array argument type
 */
export declare type UnwrapArray<T> = T extends Array<infer U> ? U : T;
