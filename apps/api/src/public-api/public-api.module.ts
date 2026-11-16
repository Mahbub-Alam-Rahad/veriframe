import { Module } from "@nestjs/common";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { VideosModule } from "../videos/videos.module";
import { PublicVideosController } from "./public-videos.controller";

@Module({
  imports: [ApiKeysModule, VideosModule],
  controllers: [PublicVideosController],
})
export class PublicApiModule {}
