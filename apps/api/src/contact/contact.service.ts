import { BadRequestException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateContactDto } from "./dto/contact.dto";

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateContactDto, request: Request) {
    if (dto.website) {
      // Pretend success to bots; never persist honeypot submissions.
      return { message: "Thanks, we will get back to you shortly." };
    }

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject?.trim() || null,
        message: dto.message.trim(),
        ip: request.ip,
      },
    });

    await this.mail
      .sendContactNotification({
        name: message.name,
        email: message.email,
        subject: message.subject ?? undefined,
        message: message.message,
      })
      .catch(() => undefined);

    return { message: "Thanks, we will get back to you shortly.", id: message.id };
  }

  async list(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(50, Math.max(1, pageSize));
    const [total, items] = await Promise.all([
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
      }),
    ]);
    return {
      items,
      pagination: {
        page: safePage,
        pageSize: safeSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeSize)),
      },
    };
  }

  async updateStatus(id: string, status: string) {
    if (!["NEW", "READ", "IN_PROGRESS", "RESOLVED"].includes(status)) {
      throw new BadRequestException("Invalid status");
    }
    const message = await this.prisma.contactMessage.update({
      where: { id },
      data: { status: status as "NEW" | "READ" | "IN_PROGRESS" | "RESOLVED" },
    });
    return { message };
  }
}
