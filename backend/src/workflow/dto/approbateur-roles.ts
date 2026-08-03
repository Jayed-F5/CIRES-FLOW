import { Role } from '@prisma/client';

// EMPLOYE is the requester role, and ADMIN is the system administrator role —
// neither represents a real approver in a business approval circuit.
export const APPROBATEUR_ROLES = [Role.AGENT, Role.MANAGER] as const;
