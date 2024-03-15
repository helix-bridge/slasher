import {Wallet, HDNodeWallet, ethers, Contract, InterfaceAbi, TransactionResponse} from "ethers";
import { GasPrice } from "../base/provider";
import { erc20 } from "../abi/erc20";
import { lnDefaultBridge } from "../abi/lnDefaultBridge";
import { lnOppositeBridge } from "../abi/lnOppositeBridge";
import { lnv3Bridge } from "../abi/lnv3Bridge";
import { abiSafe } from "../abi/abiSafe";



export class EthereumContract {
  protected contract: Contract;
  public address: string;
  constructor(
    address: string,
    abi: InterfaceAbi,
    signer: Wallet | HDNodeWallet | ethers.Provider
  ) {
    this.contract = new Contract(address, abi, signer);
    this.address = address;
  }

  get interface() {
    return this.contract.interface;
  }

  async call(
    method: string,
    args: any,
    gas: GasPrice,
    value: bigint | null = null,
    nonce: number | null = null,
    gasLimit: bigint | null = null
  ): Promise<TransactionResponse> {
    const gasArgs = gas.isEip1559 ? gas.eip1559fee : gas.fee;
    const txConfig = Object.entries({
      ...gasArgs,
      value,
      nonce,
      gasLimit,
    }).reduce((c, [k, v]) => (v ? ((c[k] = v), c) : c), {});
    return await this.contract[method](...args, txConfig);
  }

  async staticCall(
    method: string,
    args: any,
    value: bigint | null = null,
    gasLimit: bigint | null = null,
    from: string | null = null
  ): Promise<string> | null {
    try {
      var options = {};
      if (value != null) {
        options = { value: value };
      }
      if (from != null) {
        options[from] = from;
      }
      if (value != null) {
        args = [...args, options];
      }
      await this.contract[method].staticCall(...args);
      return null;
    } catch (error) {
      return error.message;
    }
  }
}

export class LnBridgeContract extends EthereumContract {
  private bridgeType: string;
  constructor(
    address: string,
    signer: Wallet | HDNodeWallet | ethers.Provider,
    bridgeType: string
  ) {
    if (bridgeType === "lnv2-default") {
      super(address, lnDefaultBridge, signer);
    } else {
      super(address, lnOppositeBridge, signer);
    }
    this.bridgeType = bridgeType;
  }

  private getProviderKey(
    remoteChainId: number,
    provider: string,
    sourceToken: string,
    targetToken: string
  ) {
    const encode = ethers.solidityPacked(
      ["uint256", "address", "address", "address"],
      [remoteChainId, provider, sourceToken, targetToken]
    );
    return ethers.keccak256(encode);
  }

}

export class Lnv3BridgeContract extends EthereumContract {
  constructor(
    address: string,
    signer: Wallet | HDNodeWallet | ethers.Provider
  ) {
    super(address, lnv3Bridge, signer);
  }

  private getProviderKey(
    remoteChainId: number,
    provider: string,
    sourceToken: string,
    targetToken: string
  ) {
    const encode = ethers.solidityPacked(
      ["uint256", "address", "address", "address"],
      [remoteChainId, provider, sourceToken, targetToken]
    );
    return ethers.keccak256(encode);
  }

}

