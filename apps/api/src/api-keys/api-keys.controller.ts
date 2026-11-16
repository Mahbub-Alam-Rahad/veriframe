import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/api-keys.dto";

@ApiTags("api-keys")
@Controller("api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: "List API keys (secrets are never returned)" })
  async list(@CurrentUser("id") userId: string) {
    return this.apiKeys.list(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create an API key; the secret is returned exactly once" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(user, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Revoke an API key" })
  async revoke(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.apiKeys.revoke(userId, id);
  }
}
