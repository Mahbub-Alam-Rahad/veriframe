import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiKeyGuard } from "../api-keys/api-key.guard";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/auth.decorators";
import { videoUploadOptions } from "../videos/upload.options";
import { VideosService } from "../videos/videos.service";

@ApiTags("public-api")
@ApiSecurity("api-key")
@Public()
@UseGuards(ApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("public/v1/videos")
export class PublicVideosController {
  constructor(private readonly videos: VideosService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", videoUploadOptions))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  @ApiOperation({ summary: "Upload and analyze a video using an API key" })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException("Attach a video file in the 'file' field");
    return this.videos.upload(user, file);
  }

  @Get(":id")
  @ApiOperation({ summary: "Poll one of your API-uploaded videos" })
  async get(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.videos.getById(userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a video and its analysis" })
  async remove(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.videos.delete(userId, id);
  }
}
