import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AnalysesService } from "../analyses/analyses.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { Roles } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AdminService } from "./admin.service";
import {
  CreateModelVersionDto,
  ListAdminUsersQueryDto,
  ListAdminVideosQueryDto,
  ListAuditQueryDto,
  ListMessagesQueryDto,
  UpdateAdminUserDto,
  UpdateMessageDto,
} from "./dto/admin.dto";

@ApiTags("admin")
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly analyses: AnalysesService,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "Platform overview metrics" })
  async stats() {
    return this.admin.stats();
  }

  @Get("users")
  @ApiOperation({ summary: "Search and filter users" })
  async users(@Query() query: ListAdminUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch("users/:id")
  @ApiOperation({ summary: "Change a user's role, plan or ban status" })
  async updateUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.admin.updateUser(actor, id, dto);
  }

  @Get("videos")
  @ApiOperation({ summary: "List all videos and analyses" })
  async videos(@Query() query: ListAdminVideosQueryDto) {
    return this.admin.listVideos(query);
  }

  @Post("videos/:id/retry")
  @ApiOperation({ summary: "Requeue a video analysis" })
  async retryVideo(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.retryVideo(actor, id);
  }

  @Delete("videos/:id")
  @ApiOperation({ summary: "Delete a video, analysis and stored media" })
  async deleteVideo(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.deleteVideo(actor, id);
  }

  @Get("analyses/:id/report")
  @ApiOperation({ summary: "Download any analysis PDF as an admin" })
  async report(@Param("id") id: string, @Res() response: Response): Promise<void> {
    const { buffer, filename } = await this.analyses.reportForAdmin(id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(buffer);
  }

  @Get("messages")
  @ApiOperation({ summary: "Contact inbox" })
  async messages(@Query() query: ListMessagesQueryDto) {
    return this.admin.listMessages(query);
  }

  @Patch("messages/:id")
  @ApiOperation({ summary: "Update a contact message status" })
  async updateMessage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.admin.updateMessage(actor, id, dto.status);
  }

  @Get("models")
  @ApiOperation({ summary: "List model versions" })
  async models() {
    return this.admin.listModels();
  }

  @Roles(Role.SUPER_ADMIN)
  @Post("models")
  @ApiOperation({ summary: "Register a model version (super admin)" })
  async createModel(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateModelVersionDto,
  ) {
    return this.admin.createModel(actor, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post("models/:id/activate")
  @ApiOperation({ summary: "Activate a model version (super admin)" })
  async activateModel(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.activateModel(actor, id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete("models/:id")
  @ApiOperation({ summary: "Delete an inactive model version (super admin)" })
  async deleteModel(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.deleteModel(actor, id);
  }

  @Get("audit")
  @ApiOperation({ summary: "Audit log" })
  async audit(@Query() query: ListAuditQueryDto) {
    return this.admin.listAudit(query);
  }

  @Get("system")
  @ApiOperation({ summary: "Database, Redis, queue, ML and storage health" })
  async system() {
    return this.admin.system();
  }
}
