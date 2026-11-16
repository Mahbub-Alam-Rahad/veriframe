import { Module } from "@nestjs/common";
import { AnalysesModule } from "../analyses/analyses.module";
import { ContactModule } from "../contact/contact.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AnalysesModule, ContactModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
