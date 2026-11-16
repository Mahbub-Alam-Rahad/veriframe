import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ListVideosQueryDto } from "./dto/videos.dto";
import { videoUploadOptions } from "./upload.options";
import { VideosService } from "./videos.service";

@ApiTags("videos")
@Controller("videos")
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  @ApiOperation({ summary: "Upload a video and enqueue an analysis" })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException("Attach a video file in the 'file' field");
    return this.videos.upload(user, file);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's videos" })
  async list(@CurrentUser("id") userId: string, @Query() query: ListVideosQueryDto) {
    return this.videos.list(userId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one video, signed URLs and its analysis" })
  async get(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.videos.getById(userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a video, its analysis and stored media" })
  async remove(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.videos.delete(userId, id);
  }

  @Post(":id/retry")
  @ApiOperation({ summary: "Retry a failed analysis" })
  async retry(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.videos.retry(userId, id);
  }
}
