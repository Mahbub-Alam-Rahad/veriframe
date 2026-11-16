import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AnalysesService } from "./analyses.service";
import { ListAnalysesQueryDto } from "./dto/analyses.dto";

@ApiTags("analyses")
@Controller("analyses")
export class AnalysesController {
  constructor(private readonly analyses: AnalysesService) {}

  @Get()
  @ApiOperation({ summary: "List analyses for the current user" })
  async list(@CurrentUser("id") userId: string, @Query() query: ListAnalysesQueryDto) {
    return this.analyses.list(userId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an analysis with signed video and thumbnail URLs" })
  async get(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.analyses.get(userId, id);
  }

  @Get(":id/report")
  @ApiOperation({ summary: "Download the PDF report" })
  async report(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.analyses.reportPdf(userId, id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(buffer);
  }
}
