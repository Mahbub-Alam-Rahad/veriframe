import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: string;
  emailVerifiedAt: Date | null;
  sessionId?: string;
}
