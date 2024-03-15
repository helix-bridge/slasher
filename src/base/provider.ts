import { ethers } from "ethers";
import { GWei } from "./bignumber";


export interface EIP1559Fee {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface GasFee {
  gasPrice: bigint;
}

export interface GasPrice {
  eip1559fee: EIP1559Fee | null;
  fee: GasFee | null;
  isEip1559: boolean;
}

export interface TransactionInfo {
  gasPrice: GasPrice | null;
  confirmedBlock: number;
  nonce: number | null;
}

export function scaleBigger(
  left: GasPrice,
  right: GasPrice,
  scale: number
): boolean {
  if (left.isEip1559) {
    const leftGasPrice = left.eip1559fee.maxFeePerGas;
    const rightGasPrice = new GWei(right.eip1559fee.maxFeePerGas);
    return leftGasPrice < rightGasPrice.mul(scale).Number;
  } else {
    const leftGasPrice = left.fee.gasPrice;
    const rightGasPrice = new GWei(right.fee.gasPrice);
    return leftGasPrice < rightGasPrice.mul(scale).Number;
  }
}

export class EthereumProvider {
  public provider: ethers.JsonRpcProvider;

  constructor(url: string) {
    this.provider = new ethers.JsonRpcProvider(url);
  }

  async currentBlocknumber() {
    return await this.provider.getBlockNumber();
  }

  async balanceOf(address: string): Promise<bigint> {
    return await this.provider.getBalance(address);
  }

}
