import {Injectable, Logger, OnModuleInit} from "@nestjs/common";
import axios from "axios";
// import {
//   Erc20Contract,
//   LnBridgeContract,
//   Lnv3BridgeContract,
//   zeroTransferId,
// } from "../base/contract";

export interface HistoryRecord {
  id: string
  fromChain: string
  toChain: string
  bridge: string
  reason: string
  nonce: number
  requestTxHash: string
  responseTxHash: string
  sender: string
  recipient: string
  sendToken: string
  recvToken: string
  sendAmount: string
  recvAmount: string
  startTime: number
  endTime: number
  result: number
  fee: string
  feeToken: string
  messageNonce: string
  sendTokenAddress: string
  recvTokenAddress: string
  guardSignatures: string
  relayer: string
  endTxHash: string
  confirmedBlocks: string
  needWithdrawLiquidity: boolean
  lastRequestWithdraw: number
}

export interface QueryPendingRecordsOptions {
  maxPendingTime?: number
}

@Injectable()
export class DataworkerService implements OnModuleInit {
  private readonly logger = new Logger("dataworker");
  private readonly statusPending = 0;

  async onModuleInit() {
    this.logger.log("data worker started");
  }

  getChainId(id: string): string {
    return id.split("-")[1];
  }

  // query record from apollo
  async queryPendingRecords(
    url: string,
    options?: QueryPendingRecordsOptions,
  ): Promise<HistoryRecord[]> {
    options = options ?? {};
    options.maxPendingTime = options.maxPendingTime ?? (((+new Date()) - (1000 * 60 * 60)) / 1000);
    // query first pending tx
    const query = `
    {
      historyRecords(
        order: "startTime_asc"
        results: 3
      ) {
        records {
          id
          fromChain
          toChain
          bridge
          reason
          nonce
          requestTxHash
          responseTxHash
          sender
          recipient
          sendToken
          recvToken
          sendAmount
          recvAmount
          startTime
          endTime
          result
          fee
          feeToken
          messageNonce
          sendTokenAddress
          recvTokenAddress
          guardSignatures
          relayer
          endTxHash
          confirmedBlocks
          needWithdrawLiquidity
          lastRequestWithdraw
        }
      }
    }
    `;
    const pendingRecords = await axios
      .post(url, {
        query,
        variables: {},
        operationName: null,
      })
      .then((res) => res.data.data.historyRecords.records);
    const records = pendingRecords as unknown as HistoryRecord[];
    return records;
    // return records.filter(item => item.startTime > options.maxPendingTime);
  }

}
