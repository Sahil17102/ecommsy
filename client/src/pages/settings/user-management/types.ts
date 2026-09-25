export type TeamRole = "owner" | "member";

export interface TeamMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  teamRole: TeamRole;
  parentUserId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTeamMembersResponse {
  members: TeamMember[];
}

export interface TeamMemberResponse {
  member: TeamMember;
}

export interface ResetPasswordResponse {
  message: string;
  tempPassword: string;
  resetBy: "owner" | "admin";
}

export interface CreateTeamMemberPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}
