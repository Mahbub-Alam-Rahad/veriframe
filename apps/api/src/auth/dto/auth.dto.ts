import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, {
    message: "password must include an uppercase letter, a lowercase letter and a number",
  })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class TokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, {
    message: "password must include an uppercase letter, a lowercase letter and a number",
  })
  password!: string;
}
