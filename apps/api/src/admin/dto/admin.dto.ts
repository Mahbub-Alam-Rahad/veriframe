import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  ContactStatus,
  ModelBackend,
  Plan,
  Role,
  VideoStatus,
} from "@prisma/client";

export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class ListAdminUsersQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @IsOptional()
  @IsBoolean()
  banned?: boolean;
}

export class ListAdminVideosQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;
}

export class ListMessagesQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}

export class UpdateMessageDto {
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}

export class ListAuditQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;
}

export class CreateModelVersionDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 40)
  version!: string;

  @IsEnum(ModelBackend)
  backend!: ModelBackend;

  @IsString()
  @Length(1, 200)
  modelId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(10)
  calibrationTemperature?: number;

  @IsOptional()
  @IsObject()
  metrics?: Record<string, number | string>;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}
