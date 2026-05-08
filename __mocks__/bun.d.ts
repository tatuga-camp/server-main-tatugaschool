export declare class RedisClient {
    constructor(url?: string);
    connect(): Promise<void>;
    close(): void;
    get(key: string): Promise<any>;
    set(key: string, value: string, options?: any): Promise<void>;
    del(key: string): Promise<void>;
    hget(key: string, field: string): Promise<any>;
    hset(key: string, field: string, value: string): Promise<void>;
    expire(key: string, seconds: number): Promise<void>;
}
