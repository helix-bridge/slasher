import {Logger} from "@nestjs/common";
import {SlashOptions} from "./types";
import {RequestSlashAndRemoteReleaseOptions} from "../base/contract";
import {EtherBigNumber} from "../base/bignumber";


export interface SlashComponent {
  slash(options: SlashOptions): Promise<string>;
}


export class Lnv2DefaultSlash implements SlashComponent {
  private readonly logger = new Logger("slash-lnv2-default");

  async slash(options: SlashOptions): Promise<string> {
    const {record, lnBridge} = options;
    const gasPrice = await lnBridge.fromBridge.chainInfo.provider.feeData(
      1,
      lnBridge.fromBridge.chainInfo.notSupport1559,
    );
    const configuredGasLimit = options.relayGasLimit;
    const relayGasLimit = configuredGasLimit !== undefined
      ? new EtherBigNumber(configuredGasLimit).Number
      : null;

    const requestSlashAndRemoteReleaseOptions: RequestSlashAndRemoteReleaseOptions = {
      payableAmount: 0,
      params: {
        previousTransferId: '1',
        provider: '1',
        sourceToken: record.sendTokenAddress,
        targetToken: record.recvTokenAddress,
        amount: new EtherBigNumber(record.recvAmount).Number,
        timestamp: record.startTime,
        receiver: record.recipient,
      },
      remoteChainId: lnBridge.toBridge.chainInfo.id,
      expectedTransferId: '1',
      extParams: '1',
      gas: gasPrice,
      gasLimit: relayGasLimit,
    };
    const tx = await lnBridge.fromBridge.bridge.requestSlashAndRemoteRelease(
      requestSlashAndRemoteReleaseOptions
    );
    return tx.hash;
  }

}

export class Lnv2OppositeSlash implements SlashComponent {
  private readonly logger = new Logger('slash-lnv2-opposite');

  async slash(options: SlashOptions): Promise<string> {
    const {record, lnBridge} = options;
    const gasPrice = await lnBridge.toBridge.chainInfo.provider.feeData(
      1,
      lnBridge.toBridge.chainInfo.notSupport1559,
    );
    const configuredGasLimit = options.relayGasLimit;
    const relayGasLimit = configuredGasLimit !== undefined
      ? new EtherBigNumber(configuredGasLimit).Number
      : null;

    const requestSlashAndRemoteReleaseOptions: RequestSlashAndRemoteReleaseOptions = {
      payableAmount: 0,
      params: {
        previousTransferId: '1',
        provider: '1',
        sourceToken: record.sendTokenAddress,
        targetToken: record.recvTokenAddress,
        amount: new EtherBigNumber(record.recvAmount).Number,
        timestamp: record.startTime,
        receiver: record.recipient,
      },
      remoteChainId: lnBridge.toBridge.chainInfo.id, // todo: is there use toBridge?
      expectedTransferId: '1',
      extParams: '1',
      gas: gasPrice,
      gasLimit: relayGasLimit,
    };
    const tx = await lnBridge.toBridge.bridge.requestSlashAndRemoteRelease(
      requestSlashAndRemoteReleaseOptions
    );
    return tx.hash;
  }
}

export class Lnv3Slash implements SlashComponent {
  private readonly logger = new Logger("slash-lnv3");

  private readonly lnv2Slash: Lnv2OppositeSlash = new Lnv2OppositeSlash();

  async slash(options: SlashOptions): Promise<string> {
    return await this.lnv2Slash.slash(options);
  }
}
