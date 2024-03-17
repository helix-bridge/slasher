import {Chain} from "../configure/base.service";
import {EthereumProvider} from "../base/provider";
import {LnBridgeContract, Lnv3BridgeContract} from "../base/contract";
import {HistoryRecord} from "../dataworker/dataworker.service";


export interface ChainInfo extends Chain {
  provider: EthereumProvider
}

export class BridgeConnectInfo {
  chainInfo: ChainInfo;
  bridge: LnBridgeContract | Lnv3BridgeContract;
}

interface LnBridge {
  bridgeType: string;
  fromBridge: BridgeConnectInfo;
  toBridge: BridgeConnectInfo;
}

export class SlashOptions {
  record: HistoryRecord
  lnBridge: LnBridge
}
