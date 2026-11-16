import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

export class CreateContactDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5_000)
  message!: string;

  // Honeypot: real users never fill this hidden field.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateContactStatusDto {
  @IsString()
  @Length(1, 20)
  status!: "NEW" | "READ" | "IN_PROGRESS" | "RESOLVED";
}
