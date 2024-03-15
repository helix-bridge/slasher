import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from "./tasks/tasks.module";
import { DataworkerModule } from "./dataworker/dataworker.module";
import { ConfigureModule } from "./configure/configure.module";
import {SlasherModule} from "./slasher/slasher.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env"],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TasksModule,
    DataworkerModule,
    ConfigureModule,
    SlasherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
