import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import {Chain, BaseConfigure, BaseConfigService} from "./base.service";
import * as fs from "fs";

export interface RpcNode {
  name: string;
  rpc: string;
  fixedGasPrice: number;
  notSupport1559: boolean;
}

export interface BridgeInfo {
  direction: string;
  encryptedPrivateKey: string;
}

export interface ConfigInfo {
  env: string
  indexer: string
  rpcnodes: RpcNode[]
  bridges: BridgeInfo[]
  relayGasLimit: number
}

@Injectable()
export class ConfigureService {
  private readonly configPath =
    this.configService.get<string>("LP_BRIDGE_PATH");
  public readonly storePath = this.configService.get<string>(
    "LP_BRIDGE_STORE_PATH"
  );
  public config: ConfigInfo = JSON.parse(
    fs.readFileSync(this.configPath, "utf8")
  );
  public baseConfig: BaseConfigure;

  constructor(
    private configService: ConfigService,
    private baseService: BaseConfigService
  ) {
    this.baseConfig = this.baseService.baseConfigure(
      this.config.env === "test"
    );
  }

  public getChainInfo(name: string): Chain | null {
    return this.baseConfig.chains.find((chain) => chain.name === name);
  }

  get indexer(): string {
    return this.config.indexer ?? this.baseConfig.indexer;
  }

  get supportedChains(): string[] {
    return this.baseConfig.chains.map((item) => item.name);
  }
}
