import level from "level-ts";

export class Store {
  private db: level;

  constructor(public storePath: string) {
    this.db = new level(storePath);
  }

  async put<T>(key: string, value: T) {
    const serializedValue = JSON.stringify(value);
    await this.db.put(key, serializedValue);
  }

  async exists(key: string): Promise<boolean> {
    return await this.db.exists(key);
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.db.get(key);
      return JSON.parse(value);
    } catch {
    }
  }

  async delExpiredCache(): Promise<string[]> {
    const now = +new Date();
    const delKeys = [];
    await this.db.iterateFilter((value, key) => {
      try {
        const deserializedValue = JSON.parse(value);
        const timestamp = deserializedValue.timestamp;
        if (!timestamp) {
          return false;
        }
        if (now - timestamp > (1000 * 60 * 60)) {
          delKeys.push(key);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });
    for (const key of delKeys) {
      await this.db.del(key);
    }
    return delKeys;
  }
}
