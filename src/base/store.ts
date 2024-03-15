import level from "level-ts";

export class Store {
  private db: level;
  private cachePendingTxs = new Map();

  constructor(public storePath: string) {
    this.db = new level(storePath);
  }

  // async savePendingTransaction(chainName: string, txHash: string) {
  //   this.cachePendingTxs[chainName] = txHash;
  //   await this.db.put(chainName, txHash);
  // }
  //
  // async getPendingTransaction(chainName: string): Promise<string> | null {
  //   var txHash: string = this.cachePendingTxs[chainName];
  //   if (!txHash) {
  //     try {
  //       txHash = await this.db.get(chainName);
  //       this.cachePendingTxs[chainName] = txHash;
  //     } catch {}
  //   }
  //   return txHash;
  // }
  //
  // async delPendingTransaction(chainName: string) {
  //   this.cachePendingTxs[chainName] = undefined;
  //   await this.db.del(chainName);
  // }

  async put<T>(key: string, value: T) {
    const serializedValue = JSON.stringify(value);
    await this.db.put(key, serializedValue);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this
  }
}
