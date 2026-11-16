import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateProfileDto,
} from "./dto/users.dto";
import { UsersService } from "./users.service";

@ApiTags("account")
@Controller("me")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Current profile, plan, limits and usage" })
  async me(@CurrentUser("id") userId: string) {
    return this.users.getMe(userId);
  }

  @Patch()
  @ApiOperation({ summary: "Update display name" })
  async update(@CurrentUser("id") userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Get("stats")
  @ApiOperation({ summary: "Dashboard aggregates and recent activity" })
  async stats(@CurrentUser("id") userId: string) {
    return this.users.getStats(userId);
  }

  @Get("sessions")
  @ApiOperation({ summary: "List active refresh sessions" })
  async sessions(@CurrentUser() user: AuthenticatedUser & { sessionId?: string }) {
    return this.users.listSessions(user.id, user.sessionId);
  }

  @Delete("sessions/:id")
  @ApiOperation({ summary: "Revoke one refresh session" })
  async revokeSession(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.users.revokeSession(userId, id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change password and revoke other sessions" })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser & { sessionId?: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(user, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Delete()
  @ApiOperation({ summary: "Permanently delete the account and stored media" })
  async delete(@CurrentUser("id") userId: string, @Body() dto: DeleteAccountDto) {
    return this.users.deleteAccount(userId, dto);
  }
}
