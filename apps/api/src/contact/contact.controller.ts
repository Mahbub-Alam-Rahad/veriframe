import { Body, Controller, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/auth.decorators";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/contact.dto";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: "Send a public contact message" })
  async create(@Body() dto: CreateContactDto, @Req() request: Request) {
    return this.contact.create(dto, request);
  }
}
