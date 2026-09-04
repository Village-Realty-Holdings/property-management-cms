import type { Access, FieldAccess } from 'payload'

/** Accepts any authenticated principal, including MCP API keys, which have no roles. */
export const isSuperAdminUser = (user: null | object | undefined): boolean =>
  Boolean(
    user &&
      'roles' in user &&
      Array.isArray(user.roles) &&
      user.roles.includes('super-admin'),
  )

export const isSuperAdmin: Access = ({ req: { user } }) => isSuperAdminUser(user)

export const isSuperAdminField: FieldAccess = ({ req: { user } }) => isSuperAdminUser(user)
