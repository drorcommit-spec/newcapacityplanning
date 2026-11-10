import { TeamMember, CompanyGroup, DEFAULT_COMPANY_GROUP } from '../types';

// Resolve a member's company group. Company group is a first-class, persisted field
// (team_members.company_group) and is independent of the teams array. Falls back to the
// default group only when a member has no company group set.
export function getMemberCompanyGroup(member: Pick<TeamMember, 'companyGroup'>): CompanyGroup {
  return member.companyGroup || DEFAULT_COMPANY_GROUP;
}
