import type { Access, FieldAccess } from 'payload'

import type { PayloadMcpApiKey, User } from '@/payload-types'

/** MCP API keys are valid principals but carry no roles, so they are never super admins. */
export const isSuperAdminUser = (user: null | PayloadMcpApiKey | undefined | User): boolean =>
  Boolean(user && 'roles' in user && user.roles?.includes('super-admin'))

export const isSuperAdmin: Access = ({ req: { user } }) => isSuperAdminUser(user)

export const isSuperAdminField: FieldAccess = ({ req: { user } }) => isSuperAdminUser(user)
