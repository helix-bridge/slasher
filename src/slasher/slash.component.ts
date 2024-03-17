import {Logger} from "@nestjs/common";
import {SlashOptions} from "./types";


export interface SlashComponent {
  slash(options: SlashOptions): Promise<void>;
}


// @Injectable()
export class Lnv2DefaultSlash implements SlashComponent {
  private readonly logger = new Logger("slash-lnv2-default");

  async slash(options: SlashOptions): Promise<void> {
    console.log(options.lnBridge);
    console.log(`from: ${options.record.fromChain} to: ${options.record.toChain}`);
  }

}

export class Lnv2OppositeSlash implements SlashComponent {
  private readonly logger = new Logger('slash-lnv2-opposite');

  async slash(options: SlashOptions): Promise<void> {
    this.logger.debug('coming soon lnv2-opposite')
  }
}

// @Injectable()
export class Lnv3Slash implements SlashComponent {
  private readonly logger = new Logger("slash-lnv3");

  async slash(options: SlashOptions): Promise<void> {
    this.logger.debug('coming soon lnv3')
  }
}
