import {Injectable, Logger, OnModuleInit} from "@nestjs/common";
import {setTimeout} from "timers/promises";
import {TasksService} from "../tasks/tasks.service";
import {Store} from "../base/store";

import {DataworkerService, HistoryRecord} from "../dataworker/dataworker.service";
import {ConfigureService} from "../configure/configure.service";
import {Encrypto} from "../base/encrypto";
import {EthereumProvider,} from "../base/provider";
import {LnBridgeContract, Lnv3BridgeContract} from "../base/contract";
import {Lnv2DefaultSlash, Lnv2OppositeSlash, Lnv3Slash, SlashComponent} from "./slash.component";
import {EthereumConnectedWallet} from "../base/wallet";
import {ChainInfo, LnBridge, SlashOptions} from "./types";


interface CacheSlashedInfo {
  txHash: string
  timestamp: number
}

@Injectable()
export class SlasherService implements OnModuleInit {

  private readonly logger = new Logger("slasher");
  private readonly scheduleInterval = 10000;
  private readonly maxWaitingPendingTimes = 180;

  private chainInfos = new Map<string, ChainInfo>();
  private slashComponentMap = new Map<string, SlashComponent>
  private encrypto: Encrypto;
  private lnBridges: LnBridge[];
  public store: Store;

  constructor(
    protected taskService: TasksService,
    protected dataworkerService: DataworkerService,
    protected configureService: ConfigureService
  ) {
  }

  async onModuleInit() {
    this.logger.log("slasher service start");
    this.initConfigure();
    this.bootstrap();
  }

  private initConfigure() {
    this.encrypto = new Encrypto();
    this.encrypto.readPasswd();

    this.store = new Store(this.configureService.storePath);
    this.chainInfos = new Map(
      this.configureService.config.rpcnodes
        .filter(rpcnode => {
          const chainInfo = this.configureService.getChainInfo(rpcnode.name);
          if (chainInfo) {
            return true;
          }
          this.logger.warn(
            `the chain ${rpcnode.name} not support, only support ${this.configureService.supportedChains}`
          );
          return false;
        })
        .map(rpcnode => {
          const chainInfo = this.configureService.getChainInfo(rpcnode.name);
          return [
            rpcnode.name,
            {
              ...rpcnode,
              ...chainInfo,
              provider: new EthereumProvider(rpcnode.rpc),
            } as unknown as ChainInfo,
          ];
        })
    );
    this.lnBridges = [];

    this.slashComponentMap = new Map();
    this.slashComponentMap.set('lnv3', new Lnv3Slash());
    this.slashComponentMap.set('lnv2-default', new Lnv2DefaultSlash());
    this.slashComponentMap.set('lnv2-opposite', new Lnv2OppositeSlash());
  }

  private async bootstrap() {
    this.taskService.addScheduleTask(
      'clean-slashed-cache',
      this.scheduleInterval,
      async () => await this.cleanCache(),
    );
    while (true) {
      await this.slash();
      await setTimeout(this.scheduleInterval);
    }
  }

  private async initLnBridge(record: HistoryRecord): Promise<LnBridge> {
    const pickedLnBridgeConfig = this.lnBridges.find(
      item =>
        item.fromBridge.chainInfo.name === record.fromChain
        && item.toBridge.chainInfo.name === record.toChain
    );
    if (pickedLnBridgeConfig) {
      return pickedLnBridgeConfig;
    }
    const fromChainInfo = this.chainInfos.get(record.fromChain);
    if (!fromChainInfo) {
      this.logger.warn(`from chain is not invalid ${record.fromChain}`);
      return;
    }
    const toChainInfo = this.chainInfos.get(record.toChain);
    if (!toChainInfo) {
      this.logger.warn(`to chain is not invalid ${record.toChain}`);
      return;
    }
    const bridgePair = `${record.fromChain}->${record.toChain}`;
    let pickedBridgeConfig = this.configureService.config.bridges
      .find(item => item.direction === bridgePair);
    if (!pickedBridgeConfig) {
      this.logger.warn(`missed config for bridge ${bridgePair}, please add to config file`);
      return;
    }
    const privateKey = this.encrypto.decrypt(pickedBridgeConfig.encryptedPrivateKey);

    let toWallet = new EthereumConnectedWallet(
      privateKey,
      toChainInfo.provider
    );
    let toBridge = record.bridge == "lnv3"
      ? new Lnv3BridgeContract(toChainInfo.lnv3Address, toWallet.wallet)
      : new LnBridgeContract(
        record.bridge === "lnv2-default"
          ? toChainInfo.lnv2DefaultAddress
          : toChainInfo.lnv2OppositeAddress,
        toWallet.wallet,
        record.bridge
      );


    let fromWallet = new EthereumConnectedWallet(
      privateKey,
      fromChainInfo.provider
    );
    let fromBridge = record.bridge == "lnv3"
      ? new Lnv3BridgeContract(
        fromChainInfo.lnv3Address,
        fromWallet.wallet
      )
      : new LnBridgeContract(
        record.bridge === "lnv2-default"
          ? fromChainInfo.lnv2DefaultAddress
          : fromChainInfo.lnv2OppositeAddress,
        fromWallet.wallet,
        record.bridge
      );

    let fromConnectInfo = {
      chainInfo: fromChainInfo,
      bridge: fromBridge,
    };

    let toConnectInfo = {
      chainInfo: toChainInfo,
      bridge: toBridge,
    };

    const lnBridge = {
      bridgeType: record.bridge,
      fromBridge: fromConnectInfo,
      toBridge: toConnectInfo,
    };
    this.lnBridges.push(lnBridge);
    return lnBridge;
  }

  private async slash() {
    const pendingRecords = await this.dataworkerService.queryPendingRecords(
      this.configureService.indexer,
    );
    for (const record of pendingRecords) {
      if (await this.store.exists(record.id)) {
        this.logger.debug(`this record ${record.id} already slashed.`);
        continue;
      }
      const slashComponent: SlashComponent = this.slashComponentMap.get(record.bridge);
      if (!slashComponent) {
        this.logger.warn(`unsupported bridge type: ${record.bridge}`);
        continue;
      }
      const lnBridge = await this.initLnBridge(record);
      const options: SlashOptions = {
        record,
        lnBridge,
      };
      const txHash = await slashComponent.slash(options);
      const cacheData: CacheSlashedInfo = {
        txHash,
        timestamp: +new Date(),
      };
      await this.store.put(record.id, cacheData);
    }
  }

  private async cleanCache() {
    const delKeys = await this.store.delExpiredCache();
    if (!delKeys.length) return;
    this.logger.log(`delete expired caches: ${delKeys}`);
  }

}
