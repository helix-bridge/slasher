import {Injectable, Logger, OnModuleInit} from "@nestjs/common";
import {setTimeout} from "timers/promises";
import {TasksService} from "../tasks/tasks.service";
import { Store } from "../base/store";

import {DataworkerService} from "../dataworker/dataworker.service";
import {ConfigureService} from "../configure/configure.service";
import {EthereumConnectedWallet} from "../base/wallet";
import {Encrypto} from "../base/encrypto";
import {EthereumProvider,} from "../base/provider";
import {Chain} from "../configure/base.service";
import {LnBridgeContract, Lnv3BridgeContract} from "../base/contract";


interface ChainInfo extends Chain {
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

@Injectable()
export class SlasherService implements OnModuleInit {

  private readonly logger = new Logger("slasher");
  private readonly scheduleInterval = 10000;

  private chainInfos = new Map<string, ChainInfo>();
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
    const e = new Encrypto();
    e.readPasswd();

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

    // this.lnBridges = [];
    // for (const bridgeConfig of this.configureService.config.bridges) {
    //   const direction = bridgeConfig.direction?.split("->");
    //   if (direction?.length !== 2) {
    //     this.logger.warn(`bridge direction invalid ${bridgeConfig.direction}`);
    //     continue;
    //   }
    //   const fromChainInfo = this.chainInfos.get(direction[0]);
    //   if (!fromChainInfo) {
    //     this.logger.error(`from chain is not invalid ${direction[0]}`);
    //     continue;
    //   }
    //   const toChainInfo = this.chainInfos.get(direction[1]);
    //   if (!toChainInfo) {
    //     this.logger.error(`to chain is not invalid ${direction[1]}`);
    //     continue;
    //   }
    //
    //   const privateKey = e.decrypt(bridgeConfig.encryptedPrivateKey);
    //   let toWallet = new EthereumConnectedWallet(
    //     privateKey,
    //     toChainInfo.provider
    //   );
    //   let toBridge = bridgeConfig.bridgeType == "lnv3"
    //     ? new Lnv3BridgeContract(toChainInfo.lnv3Address, toWallet.wallet)
    //     : new LnBridgeContract(
    //       bridgeConfig.bridgeType === "lnv2-default"
    //         ? toChainInfo.lnv2DefaultAddress
    //         : toChainInfo.lnv2OppositeAddress,
    //       toWallet.wallet,
    //       bridgeConfig.bridgeType
    //     );
    //
    //
    //   let fromWallet = new EthereumConnectedWallet(
    //     privateKey,
    //     fromChainInfo.provider
    //   );
    //   let fromBridge = bridgeConfig.bridgeType == "lnv3"
    //     ? new Lnv3BridgeContract(
    //       fromChainInfo.lnv3Address,
    //       fromWallet.wallet
    //     )
    //     : new LnBridgeContract(
    //       bridgeConfig.bridgeType === "lnv2-default"
    //         ? fromChainInfo.lnv2DefaultAddress
    //         : fromChainInfo.lnv2OppositeAddress,
    //       fromWallet.wallet,
    //       bridgeConfig.bridgeType
    //     );
    //
    //   let fromConnectInfo = {
    //     chainInfo: fromChainInfo,
    //     bridge: fromBridge,
    //   };
    //
    //   let toConnectInfo = {
    //     chainInfo: toChainInfo,
    //     bridge: toBridge,
    //   };
    //
    //   this.lnBridges.push({
    //     bridgeType: bridgeConfig.bridgeType,
    //     fromBridge: fromConnectInfo,
    //     toBridge: toConnectInfo,
    //   });
    // }

  }

  private async bootstrap() {
    // this.chainInfos.forEach((value, key) => {
    //   this.taskService.addScheduleTask(
    //     `${key}-lnbridge-relayer`,
    //     this.scheduleInterval,
    //     async () => {
    //       // console.log(key)
    //     }
    //   );
    // });

    while (true) {
      await this.slash();
      await setTimeout(this.scheduleInterval);
    }
  }

  private async slash() {
    const pendingRecords = await this.dataworkerService.queryPendingRecords(this.configureService.indexer);
    for (const records of pendingRecords) {

    }
  }

}
