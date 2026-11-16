import { Module } from "@nestjs/common";
import { AnalysesController } from "./analyses.controller";
import { AnalysesService } from "./analyses.service";
import { ReportService } from "./report.service";

@Module({
  controllers: [AnalysesController],
  providers: [AnalysesService, ReportService],
  exports: [AnalysesService, ReportService],
})
export class AnalysesModule {}
